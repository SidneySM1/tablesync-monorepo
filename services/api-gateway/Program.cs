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

// 1. LEITURA DE MESAS E SEUS HORÁRIOS EXATOS (IN-MEMORY ASSEMBLY - ZERO ERROS)
app.MapGet("/api/restaurants", async ([FromQuery] DateTime? date, ReadOnlyDbContext db) =>
{
    var searchDate = date?.ToUniversalTime().Date ?? DateTime.UtcNow.Date;
    var nextDay = searchDate.AddDays(1);

    // 1. Busca tudo na memória primeiro (5 queries simples e extremamente rápidas)
    var restaurantes = await db.Restaurants.ToListAsync();
    var setores = await db.Sectors.ToListAsync();
    var mesas = await db.Tables.ToListAsync();
    var timeSlots = await db.TimeSlots.Where(ts => ts.IsActive).ToListAsync();
    
    // Busca apenas as reservas do dia solicitado para validar ocupação
    var reservasDoDia = await db.Reservations
        .Where(r => r.ReservationDate >= searchDate && r.ReservationDate < nextDay)
        .ToListAsync();

    // 2. Monta o JSON em C# (Entity Framework não tenta traduzir isso para SQL)
    var data = restaurantes.Select(r => new {
        r.Id,
        r.Name,
        Sectors = setores.Where(s => s.RestaurantId == r.Id).Select(s => new {
            s.Id,
            s.Name,
            s.HasMapLayout,
            s.AllowAnyTable,
            Tables = mesas.Where(t => t.SectorId == s.Id).Select(t => new {
                t.Id,
                t.TableNumber,
                t.Capacity,
                t.PositionX,
                t.PositionY,
                TimeSlots = timeSlots
                    .Where(ts => ts.RestaurantTableId == t.Id)
                    .OrderBy(ts => ts.StartTime)
                    .Select(ts => new {
                        ts.Id,
                        StartTime = ts.StartTime.ToString(@"hh\:mm"), // Funciona perfeitamente aqui!
                        EndTime = ts.EndTime.ToString(@"hh\:mm"),
                        IsOccupied = reservasDoDia.Any(res => 
                            res.RestaurantTableId == t.Id && 
                            res.ReservationDate == searchDate.Add(ts.StartTime))
                    }).ToList()
            }).ToList()
        }).ToList()
    }).ToList();

    return Results.Ok(data);
});

// 2. LOCK COM VALIDAÇÃO DE HORÁRIO EXATO
app.MapPost("/api/reservations/lock", async ([FromBody] LockRequest request, IConnectionMultiplexer redis, ReadOnlyDbContext db) =>
{
    var exactDateTime = request.ReservationDate.ToUniversalTime();

    bool hasReservation = await db.Reservations.AnyAsync(r => 
        r.RestaurantTableId == request.RestaurantTableId && 
        r.ReservationDate == exactDateTime);

    if (hasReservation) return Results.Conflict(new { Message = "Este horário já foi reservado." });

    var redisDb = redis.GetDatabase();
    string lockKey = $"lock:table:{request.RestaurantTableId}:time:{exactDateTime:yyyyMMddHHmm}";
    
    bool acquired = await redisDb.StringSetAsync(lockKey, request.ClientId, TimeSpan.FromMinutes(5), When.NotExists);

    if (!acquired) return Results.Conflict(new { Message = "Horário sendo selecionado por outro cliente..." });

    return Results.Ok(new { Message = "Bloqueado com sucesso", ExpiresInSeconds = 300 });
});

// 3. REGISTRO NO RABBITMQ
app.MapPost("/api/reservations", async ([FromBody] ReservationDTO res, IConnectionMultiplexer redis, ILogger<Program> logger) =>
{
    try {
        var factory = new ConnectionFactory { HostName = "localhost" };
        await using var connection = await factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();
        await channel.QueueDeclareAsync("reservation_queue", true, false, false, null);
        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(res));
        await channel.BasicPublishAsync(string.Empty, "reservation_queue", body);
        
        return Results.Accepted(value: new { Message = "Sucesso! Processando...", ReservationId = res.ReservationId });
    }
    catch {
        return Results.Problem("Erro de conexão.");
    }
});

// 4. MOTOR DE ALOCAÇÃO AUTOMÁTICA (NEXT AVAILABLE & BEST FIT)
app.MapPost("/api/reservations/quick", async ([FromBody] QuickReserveRequest req, ReadOnlyDbContext db, IConnectionMultiplexer redis) =>
{
    // 1. Define a data de partida (A partir de agora, ou de uma data específica)
    var startDate = req.TargetDate?.ToUniversalTime() ?? DateTime.UtcNow;
    var baseDate = startDate.Date;
    var currentTimeOfDay = startDate.TimeOfDay;
    
    var redisDb = redis.GetDatabase();
    int maxDaysToSearch = 30; // Limite de varredura para não criar um loop infinito

    // 2. Busca todas as "Fichas Técnicas" das mesas que atendem os requisitos (Best Fit)
    var candidates = await (from ts in db.TimeSlots
                            join t in db.Tables on ts.RestaurantTableId equals t.Id
                            join s in db.Sectors on t.SectorId equals s.Id
                            where ts.IsActive 
                               && t.Capacity >= req.GuestCount // Tem que caber a galera
                               && t.Capacity <= req.GuestCount + 2 // REGRA DE OURO: No máximo 2 lugares sobrando!
                               && (!req.SectorId.HasValue || t.SectorId == req.SectorId.Value)
                            orderby t.Capacity ascending, ts.StartTime ascending 
                            select new {
                                ts.RestaurantTableId,
                                ts.StartTime,
                                SectorName = s.Name,
                                TableCapacity = t.Capacity
                            }).ToListAsync();

    if (!candidates.Any())
        return Results.NotFound(new { Message = "Não temos mesas cadastradas para essa quantidade de pessoas." });

    // 3. A Varredura Temporal (Viajando no tempo até achar a próxima vaga real)
    for (int dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++)
    {
        var searchDate = baseDate.AddDays(dayOffset);
        bool isToday = searchDate.Date == DateTime.UtcNow.Date;

        foreach (var candidate in candidates)
        {
            // Regra de Ouro: Se a busca é para o dia de hoje, o horário não pode ter passado!
            if (isToday && candidate.StartTime <= currentTimeOfDay)
            {
                continue; // Pula horários do passado (ex: agora é 19:00, pula o slot das 18:00)
            }

            var exactDateTime = searchDate.Add(candidate.StartTime);

            // A. Verifica no Postgres se já foi comprada definitivamente
            bool inDb = await db.Reservations.AnyAsync(r => 
                r.RestaurantTableId == candidate.RestaurantTableId && 
                r.ReservationDate == exactDateTime);
            
            if (inDb) continue; 

            // B. Tenta o Lock no Redis (Atômico: When.NotExists)
            // Se outra pessoa pegou há 10 segundos, isso aqui vai retornar FALSE na hora e pular pro próximo!
            string lockKey = $"lock:table:{candidate.RestaurantTableId}:time:{exactDateTime:yyyyMMddHHmm}";
            bool acquired = await redisDb.StringSetAsync(lockKey, req.ClientId, TimeSpan.FromMinutes(5), When.NotExists);

            // C. Achamos a Próxima Vaga 100% Garantida!
            if (acquired)
            {
                return Results.Ok(new {
                    Message = "Encontramos a próxima mesa disponível!",
                    RestaurantTableId = candidate.RestaurantTableId,
                    ReservationDate = exactDateTime,
                    FormattedDate = exactDateTime.ToString("dd/MM/yyyy"), // Devolve o dia que o sistema achou!
                    Time = candidate.StartTime.ToString(@"hh\:mm"),
                    SectorName = candidate.SectorName,
                    TableCapacity = candidate.TableCapacity,
                    ExpiresInSeconds = 300
                });
            }
        }
    }

    // Se varreu 30 dias e não achou nada...
    return Results.NotFound(new { Message = $"Poxa, estamos com lotação máxima para esse perfil nos próximos {maxDaysToSearch} dias." });
});


app.Run();