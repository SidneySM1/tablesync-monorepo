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

// ==============================================================================
// 1. LEITURA DE MESAS E SEUS HORÁRIOS EXATOS
// ==============================================================================
app.MapGet("/api/restaurants", async ([FromQuery] DateTime? date, ReadOnlyDbContext db) =>
{
    // Pega apenas a DATA (00:00:00), descartando as horas.
    var searchDate = date?.ToUniversalTime().Date ?? DateTime.UtcNow.Date;

    var data = await db.Restaurants
        .Select(r => new {
            r.Id,
            r.Name,
            Sectors = db.Sectors.Where(s => s.RestaurantId == r.Id).Select(s => new {
                s.Id,
                s.Name,
                s.HasMapLayout,
                s.AllowAnyTable,
                Tables = db.Tables.Where(t => t.SectorId == s.Id).Select(t => new {
                    t.Id,
                    t.TableNumber,
                    t.Capacity,
                    t.PositionX,
                    t.PositionY,
                    // A MÁGICA: Traz os horários de cada mesa e checa a disponibilidade
                    TimeSlots = db.TimeSlots
                        .Where(ts => ts.RestaurantTableId == t.Id && ts.IsActive)
                        .Select(ts => new {
                            ts.Id,
                            StartTime = ts.StartTime.ToString(@"hh\:mm"), // Formata para o Front (ex: "18:00")
                            EndTime = ts.EndTime.ToString(@"hh\:mm"),
                            // Está ocupado se houver reserva neste exato DIA + HORA DE INÍCIO
                            IsOccupied = db.Reservations.Any(res => 
                                res.RestaurantTableId == t.Id && 
                                res.ReservationDate == searchDate.Add(ts.StartTime))
                        }).OrderBy(ts => ts.StartTime).ToList()
                }).ToList()
            }).ToList()
        }).ToListAsync();

    return Results.Ok(data);
});

// ==============================================================================
// 2. LOCK COM VALIDAÇÃO DE HORÁRIO EXATO
// ==============================================================================
app.MapPost("/api/reservations/lock", async ([FromBody] LockRequest request, IConnectionMultiplexer redis, ReadOnlyDbContext db) =>
{
    var exactDateTime = request.ReservationDate.ToUniversalTime();

    // Checa se o horário exato já tem dono
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

// ==============================================================================
// 3. REGISTRO (Mantido igual, corrigido o bug do value:)
// ==============================================================================
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

app.Run();