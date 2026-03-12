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

// 1. Conexão com o Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(sp => 
    ConnectionMultiplexer.Connect("localhost:6379"));

// 2. Conexão de Leitura com o PostgreSQL
builder.Services.AddDbContext<ReadOnlyDbContext>(options =>
    options.UseNpgsql("Host=localhost;Database=tablesync_db;Username=admin;Password=secretpassword"));

var app = builder.Build();

// ==============================================================================
// 1. ENDPOINT PARA O APP DESENHAR A TELA (GET /api/restaurants)
// ==============================================================================
app.MapGet("/api/restaurants", async (ReadOnlyDbContext db) =>
{
    // Busca os restaurantes e monta um JSON estruturado com setores e mesas
    var data = await db.Restaurants
        .Select(r => new {
            r.Id,
            r.Name,
            Sectors = db.Sectors.Where(s => s.RestaurantId == r.Id).Select(s => new {
                s.Id,
                s.Name,
                s.HasMapLayout,
                s.AllowAnyTable,
                Tables = db.Tables.Where(t => t.SectorId == s.Id).ToList()
            }).ToList()
        }).ToListAsync();

    return Results.Ok(data);
});

// ==============================================================================
// 2. ENDPOINT DE LOCK BLINDADO (POST /api/reservations/lock)
// ==============================================================================
app.MapPost("/api/reservations/lock", async ([FromBody] LockRequest request, IConnectionMultiplexer redis, ReadOnlyDbContext db, ILogger<Program> logger) =>
{
    // A. Verifica no POSTGRESQL se a mesa JÁ ESTÁ COMPRADA para aquele horário específico
    bool alreadyReservedInDb = await db.Reservations.AnyAsync(r => 
        r.RestaurantTableId == request.RestaurantTableId && 
        r.ReservationDate == request.ReservationDate.ToUniversalTime());

    if (alreadyReservedInDb)
    {
        return Results.Conflict(new { Message = "Esta mesa já possui uma reserva confirmada para este horário." });
    }

    // B. Tenta o Lock no REDIS (Agora a chave inclui o Horário!)
    // Exemplo de chave: mesa:a1b2-c3d4:horario:202603202000:bloqueada
    var dbRedis = redis.GetDatabase();
    string lockKey = $"mesa:{request.RestaurantTableId}:horario:{request.ReservationDate:yyyyMMddHHmm}:bloqueada";

    bool acquired = await dbRedis.StringSetAsync(lockKey, request.ClientId, TimeSpan.FromMinutes(5), When.NotExists);

    if (!acquired) 
        return Results.Conflict(new { Message = "Alguém está preenchendo os dados desta mesa neste exato momento. Tente novamente em 5 minutos." });

    logger.LogInformation("Mesa {TableId} bloqueada para {Client} às {Date}.", request.RestaurantTableId, request.ClientId, request.ReservationDate);
    return Results.Ok(new { Message = "Mesa bloqueada.", ExpiresInSeconds = 300 });
});

// ==============================================================================
// 3. ENDPOINT DE PUBLICAÇÃO NO RABBITMQ (POST /api/reservations)
// ==============================================================================
app.MapPost("/api/reservations", async ([FromBody] ReservationDTO reservation, ILogger<Program> logger) =>
{
    try
    {
        var factory = new ConnectionFactory { HostName = "localhost" };
        await using var connection = await factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();
        await channel.QueueDeclareAsync("reservation_queue", durable: true, exclusive: false, autoDelete: false, arguments: null);

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(reservation));
        await channel.BasicPublishAsync(string.Empty, "reservation_queue", body);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Erro no RabbitMQ.");
        return Results.Problem("Erro interno.");
    }
    return Results.Accepted(value: new { Message = "Reserva na fila.", ReservationId = reservation.ReservationId });
});

app.Run();