using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SharedContracts;
using RabbitMQ.Client;
using StackExchange.Redis;
using System.Text;
using System.Text.Json;
using ApiGateway.Data;
using ApiGateway.DTOs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options => options.AddDefaultPolicy(p => 
	p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddSingleton<IConnectionMultiplexer>(sp => 
	ConnectionMultiplexer.Connect("localhost:6379"));

builder.Services.AddDbContext<ReadOnlyDbContext>(options =>
	options.UseNpgsql("Host=localhost;Database=tablesync_db;Username=admin;Password=secretpassword"));

var app = builder.Build();
app.UseCors();

// 1. LISTAGEM HÍBRIDA (CÉREBRO NO BACKEND)
app.MapGet("/api/restaurants", async (ReadOnlyDbContext db, IConnectionMultiplexer redis) =>
{
    var redisDb = redis.GetDatabase();
    var now = DateTime.UtcNow;
    var today = now.Date;
    int maxDays = 7;

    // 1. Buscamos todos os restaurantes com seus setores, mesas e horários
    var restaurants = await db.Restaurants
        .Include(r => r.Sectors).ThenInclude(s => s.TimeSlots)
        .Include(r => r.Sectors).ThenInclude(s => s.Tables)
        .ToListAsync();

    if (!restaurants.Any()) return Results.Ok(new List<object>());

    var availableDays = Enumerable.Range(0, maxDays).Select(i => today.AddDays(i)).ToList();
    var endDate = today.AddDays(maxDays);
    
    // 2. Carregamos as reservas do período para evitar múltiplas consultas ao banco
    var reservations = await db.Reservations
        .Where(res => res.ReservationDate >= today && res.ReservationDate < endDate)
        .ToListAsync();

    // 3. Mapeamos a lista de restaurantes para o formato esperado pelo Mobile
    var result = restaurants.Select(restaurant => new
    {
        restaurant.Id, // ID fundamental para o router.replace no Expo
        restaurant.Name,
        Sectors = restaurant.Sectors.Select(s => new
        {
            s.Id,
            s.Name,
            // Define o tipo baseado nas flags do banco
            Type = s.HasMapLayout ? "MAP" : (s.AllowAnyTable ? "AUTO" : "STANDING"),
            Days = availableDays.Select(day => new
            {
                Date = day.ToString("yyyy-MM-dd"),
                Label = day.ToString("dd/MM"),
                DayName = day.ToString("ddd").ToUpper(),
                Slots = s.TimeSlots.Where(ts => ts.IsActive).OrderBy(ts => ts.StartTime).Select(ts =>
                {
                    var dt = day.Add(ts.StartTime);
                    bool isPast = day == today && ts.StartTime < now.TimeOfDay;

                    // CENÁRIO: PISTA (STANDING) - Cálculo por volume
                    if (!s.HasMapLayout && !s.AllowAnyTable) 
                    {
                        var totalOcupado = reservations.Where(r => r.SectorId == s.Id && r.ReservationDate == dt).Sum(r => r.GuestCount);
                        string standingKey = $"lock:standing:s:{s.Id}:d:{dt:yyyyMMddHHmm}";
                        var redisLocks = redisDb.HashGetAll(standingKey).Sum(h => (int)h.Value);

                        int restante = (s.TotalCapacity ?? 0) - (totalOcupado + (int)redisLocks);

                        return (object)new {
                            Time = ts.StartTime.ToString(@"hh\:mm"),
                            Remaining = Math.Max(0, restante),
                            Available = !isPast && restante > 0
                        };
                    }
                    // CENÁRIO: VIP/DECK (MAP/AUTO) - Cálculo por mesa individual
                    else 
                    {
                        var tablesData = s.Tables.Select(t => {
                            string lockKey = $"lock:t:{t.Id}:d:{dt:yyyyMMddHHmm}";
                            bool isReserved = reservations.Any(r => r.RestaurantTableId == t.Id && r.ReservationDate == dt);
                            bool isLocked = redisDb.KeyExists(lockKey);

                            return new {
                                t.Id,
                                t.TableNumber,
                                t.Capacity,
                                t.PositionX,
                                t.PositionY,
                                IsOccupied = isPast || isReserved || isLocked
                            };
                        }).ToList();

                        return new {
                            Time = ts.StartTime.ToString(@"hh\:mm"),
                            Available = !isPast && tablesData.Any(t => !t.IsOccupied),
                            Tables = tablesData
                        };
                    }
                })
            })
        })
    });

    return Results.Ok(result);
});

// 2. LOCK UNIFICADO (IDEMPOTENTE)
app.MapPost("/api/reservations/lock", async ([FromBody] LockRequest req, IConnectionMultiplexer redis, ReadOnlyDbContext db) =>
{
    var redisDb = redis.GetDatabase();
    var dt = req.ReservationDate.ToUniversalTime();

    // 1. Validação básica de horário
    if (dt < DateTime.UtcNow) return Results.BadRequest("Não é possível reservar para um horário que já passou.");

    // CENÁRIO 1: Seleção Manual de Mesa (Setor MAP ou escolha específica)
    // Se o Request já traz o ID da mesa, travamos ela diretamente.
    if (req.RestaurantTableId.HasValue)
    {
        string lockKey = $"lock:t:{req.RestaurantTableId}:d:{dt:yyyyMMddHHmm}";
        var currentToken = await redisDb.StringGetAsync(lockKey);
        
        // Se houver um lock e não for o meu próprio token, conflito
        if (currentToken.HasValue && currentToken != req.ReservationToken)
            return Results.Conflict(new { Message = "Esta mesa acabou de ser reservada por outra pessoa." });

        await redisDb.StringSetAsync(lockKey, req.ReservationToken, TimeSpan.FromMinutes(5));
        return Results.Ok(new { TableId = req.RestaurantTableId, Status = "TableLocked" });
    }

    // 2. Busca as configurações do setor para decidir a lógica
    var sector = await db.Sectors.Include(s => s.Tables).FirstOrDefaultAsync(s => s.Id == req.SectorId);
    if (sector == null) return Results.NotFound("Setor não encontrado.");

    // NOVO: Se o setor exige mapa e o App tentou dar lock sem mesa
    if (sector.HasMapLayout && !req.RestaurantTableId.HasValue)
    {
        return Results.Accepted(new 
        { 
            Action = "OPEN_MAP", 
            Message = "É necessário selecionar mesa no mapa",
            SectorId = sector.Id
        });
    }

    // CENÁRIO 2: Alocação Automática (DECK / AUTO)
    // O sistema escolhe a primeira mesa livre por você.
    if (sector.AllowAnyTable) 
    {
        var ocupadasNoDb = await db.Reservations
            .Where(r => r.SectorId == req.SectorId && r.ReservationDate == dt)
            .Select(r => r.RestaurantTableId).ToListAsync();

        var mesaLivre = sector.Tables
            .Where(t => !ocupadasNoDb.Contains(t.Id))
            .FirstOrDefault(t => !redisDb.KeyExists($"lock:t:{t.Id}:d:{dt:yyyyMMddHHmm}"));

        if (mesaLivre == null) return Results.Conflict(new { Message = "Não há mais mesas disponíveis neste setor." });

        await redisDb.StringSetAsync($"lock:t:{mesaLivre.Id}:d:{dt:yyyyMMddHHmm}", req.ReservationToken, TimeSpan.FromMinutes(5));
        return Results.Ok(new { TableId = mesaLivre.Id, TableNumber = mesaLivre.TableNumber, Status = "AutoAllocated" });
    }

    // CENÁRIO 3: Validação de Segurança para VIP (MAP)
    // Se o setor exige mapa e chegamos aqui sem ID de mesa, há um erro no fluxo do App.
    if (sector.HasMapLayout)
    {
        return Results.BadRequest(new { Message = "Este setor exige a seleção de uma mesa no mapa." });
    }

    // CENÁRIO 4: Pista (STANDING)
    // Apenas se NÃO for mapa e NÃO for auto. Lógica por volume de GuestCount.
    string standingKey = $"lock:standing:s:{req.SectorId}:d:{dt:yyyyMMddHHmm}";
    
    // Usamos HashSet para permitir que múltiplos tokens (pessoas) ocupem a pista até o limite
    await redisDb.HashSetAsync(standingKey, req.ReservationToken, req.GuestCount);
    await redisDb.KeyExpireAsync(standingKey, TimeSpan.FromMinutes(5));

    return Results.Ok(new { Message = "Vaga na pista garantida temporariamente", Status = "StandingLocked" });
});

// 3. UNLOCK
app.MapPost("/api/reservations/lock/unlock", async ([FromBody] LockRequest req, IConnectionMultiplexer redis) =>
{
	var redisDb = redis.GetDatabase();
	var dt = req.ReservationDate.ToUniversalTime();

	if (req.RestaurantTableId.HasValue)
	{
		string lockKey = $"lock:t:{req.RestaurantTableId}:d:{dt:yyyyMMddHHmm}";
		if (await redisDb.StringGetAsync(lockKey) == req.ReservationToken)
			await redisDb.KeyDeleteAsync(lockKey);
	}
	else
	{
		string standingKey = $"lock:standing:s:{req.SectorId}:d:{dt:yyyyMMddHHmm}";
		await redisDb.HashDeleteAsync(standingKey, req.ReservationToken);
	}

	return Results.Ok();
});

// 4. CONFIRMAÇÃO (RABBITMQ)
app.MapPost("/api/reservations", async ([FromBody] ReservationDTO res) =>
{
	var factory = new ConnectionFactory { HostName = "localhost" };
	await using var connection = await factory.CreateConnectionAsync();
	await using var channel = await connection.CreateChannelAsync();
	
	await channel.QueueDeclareAsync("reservation_queue", true, false, false, null);

	var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(res));
	await channel.BasicPublishAsync(string.Empty, "reservation_queue", body);
	
	// FIX: Corrigido o erro de sintaxe do Accepted
	return Results.Accepted("", new { Message = "Processando reserva...", Id = res.ReservationId });
});

app.Run();