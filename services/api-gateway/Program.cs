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

// --- CONFIGURAÇÃO DE INFRAESTRUTURA (DOCKER) ---

builder.Services.AddCors(options => options.AddDefaultPolicy(p => 
	p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// 1. REDIS COM RESILIÊNCIA
var redisConnectionString = builder.Configuration["Redis__ConnectionString"] ?? "redis:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(sp => 
{
    var options = ConfigurationOptions.Parse(redisConnectionString);
    options.AbortOnConnectFail = false; // Permite que a API espere o Redis subir no Docker
    return ConnectionMultiplexer.Connect(options);
});

// 2. POSTGRESQL (Host=postgres conforme o docker-compose)
var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                         ?? "Host=postgres;Database=tablesync_db;Username=admin;Password=secretpassword";
builder.Services.AddDbContext<ReadOnlyDbContext>(options =>
	options.UseNpgsql(dbConnectionString));

var app = builder.Build();
app.UseCors();

// 1. LISTAGEM HÍBRIDA (CÉREBRO NO BACKEND)
app.MapGet("/api/restaurants", async (ReadOnlyDbContext db, IConnectionMultiplexer redis) =>
{
    var redisDb = redis.GetDatabase();
    var now = DateTime.UtcNow;
    var today = now.Date;
    int maxDays = 7;

    var restaurants = await db.Restaurants
        .Include(r => r.Sectors).ThenInclude(s => s.TimeSlots)
        .Include(r => r.Sectors).ThenInclude(s => s.Tables)
        .ToListAsync();

    if (!restaurants.Any()) return Results.Ok(new List<object>());

    var availableDays = Enumerable.Range(0, maxDays).Select(i => today.AddDays(i)).ToList();
    var endDate = today.AddDays(maxDays);
    
    var reservations = await db.Reservations
        .Where(res => res.ReservationDate >= today && res.ReservationDate < endDate)
        .ToListAsync();

    var result = restaurants.Select(restaurant => new
    {
        restaurant.Id,
        restaurant.Name,
        Sectors = restaurant.Sectors.Select(s => new
        {
            s.Id,
            s.Name,
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
                    else 
                    {
                        var tablesData = s.Tables.Select(t => {
                            string lockKey = $"lock:t:{t.Id}:d:{dt:yyyyMMddHHmm}";
                            bool isReserved = reservations.Any(r => r.RestaurantTableId == t.Id && r.ReservationDate == dt);
                            bool isLocked = redisDb.KeyExists(lockKey);
                            return new {
                                t.Id, t.TableNumber, t.Capacity, t.PositionX, t.PositionY,
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

// 2. LOCK UNIFICADO
app.MapPost("/api/reservations/lock", async ([FromBody] LockRequest req, IConnectionMultiplexer redis, ReadOnlyDbContext db) =>
{
    var redisDb = redis.GetDatabase();
    var dt = req.ReservationDate.ToUniversalTime();

    if (dt.AddMinutes(15) < DateTime.UtcNow) 
        return Results.BadRequest("Este horário já passou.");

    if (req.RestaurantTableId.HasValue)
    {
        string lockKey = $"lock:t:{req.RestaurantTableId}:d:{dt:yyyyMMddHHmm}";
        var currentToken = await redisDb.StringGetAsync(lockKey);
        
        // Se a mesa estiver bloqueada por OUTRO token
        if (currentToken.HasValue && currentToken != req.ReservationToken)
            return Results.Conflict(new { Message = "Mesa ocupada por outro cliente." });

        await redisDb.StringSetAsync(lockKey, req.ReservationToken, TimeSpan.FromMinutes(5));
        return Results.Ok(new { TableId = req.RestaurantTableId, Status = "TableLocked", ReservationDate = dt, SectorId = req.SectorId });
    }

    var sector = await db.Sectors.Include(s => s.Tables).FirstOrDefaultAsync(s => s.Id == req.SectorId);
    if (sector == null) return Results.NotFound("Setor inexistente.");

    if (sector.HasMapLayout && !req.RestaurantTableId.HasValue)
    {
        return Results.Accepted(uri: null, value: new 
        { 
            Action = "OPEN_MAP", 
            Message = "Selecione no mapa",
            SectorId = sector.Id,
            ReservationDate = dt
        });
    }

    if (sector.AllowAnyTable) 
    {
        var ocupadasNoDb = await db.Reservations.Where(r => r.SectorId == req.SectorId && r.ReservationDate == dt).Select(r => r.RestaurantTableId).ToListAsync();
        var mesaLivre = sector.Tables.Where(t => !ocupadasNoDb.Contains(t.Id)).FirstOrDefault(t => !redisDb.KeyExists($"lock:t:{t.Id}:d:{dt:yyyyMMddHHmm}"));
        if (mesaLivre == null) return Results.Conflict(new { Message = "Sem mesas no setor." });

        await redisDb.StringSetAsync($"lock:t:{mesaLivre.Id}:d:{dt:yyyyMMddHHmm}", req.ReservationToken, TimeSpan.FromMinutes(5));
        return Results.Ok(new { TableId = mesaLivre.Id, TableNumber = mesaLivre.TableNumber, Status = "AutoAllocated", ReservationDate = dt });
    }

    string standingKey = $"lock:standing:s:{req.SectorId}:d:{dt:yyyyMMddHHmm}";
    await redisDb.HashSetAsync(standingKey, req.ReservationToken, req.GuestCount);
    await redisDb.KeyExpireAsync(standingKey, TimeSpan.FromMinutes(5));

    return Results.Ok(new { Message = "Vaga na pista garantida", Status = "StandingLocked", ReservationDate = dt });
});

// 3. UNLOCK
app.MapPost("/api/reservations/lock/unlock", async ([FromBody] LockRequest req, IConnectionMultiplexer redis) =>
{
	var redisDb = redis.GetDatabase();
	var dt = req.ReservationDate.ToUniversalTime();
	if (req.RestaurantTableId.HasValue) {
		string lockKey = $"lock:t:{req.RestaurantTableId}:d:{dt:yyyyMMddHHmm}";
		if (await redisDb.StringGetAsync(lockKey) == req.ReservationToken) await redisDb.KeyDeleteAsync(lockKey);
	} else {
		string standingKey = $"lock:standing:s:{req.SectorId}:d:{dt:yyyyMMddHHmm}";
		await redisDb.HashDeleteAsync(standingKey, req.ReservationToken);
	}
	return Results.Ok();
});

// 4. CONFIRMAÇÃO (RABBITMQ - Host=rabbitmq conforme docker-compose)
app.MapPost("/api/reservations", async ([FromBody] ReservationDTO res, IConfiguration config) =>
{
    var rabbitHost = config["RabbitMQ__Host"] ?? "rabbitmq";
	var factory = new ConnectionFactory { HostName = rabbitHost };
	await using var connection = await factory.CreateConnectionAsync();
	await using var channel = await connection.CreateChannelAsync();
	
	await channel.QueueDeclareAsync("reservation_queue", true, false, false, null);
	var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(res));
	await channel.BasicPublishAsync(string.Empty, "reservation_queue", body);
	
	return Results.Accepted(uri: null, value: new { Message = "Processando...", Id = res.ReservationId });
});

app.Run();