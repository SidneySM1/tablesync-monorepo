using Microsoft.AspNetCore.Mvc;
using SharedContracts;
using RabbitMQ.Client;
using StackExchange.Redis;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IConnectionMultiplexer>(sp => 
    ConnectionMultiplexer.Connect("localhost:6379"));

var app = builder.Build();

app.MapGet("/", () => "TableSync API Gateway rodando com sucesso!");

// Endpoint de Lock (Agora usa Guid)
app.MapPost("/api/reservations/lock", async ([FromBody] LockRequest request, IConnectionMultiplexer redis, ILogger<Program> logger) =>
{
    var db = redis.GetDatabase();
    string lockKey = $"mesa:{request.RestaurantTableId}:bloqueada";

    bool acquired = await db.StringSetAsync(lockKey, request.ClientId, TimeSpan.FromMinutes(5), When.NotExists);

    if (!acquired) return Results.Conflict(new { Message = "Esta mesa acabou de ser selecionada por outro cliente." });

    logger.LogInformation("Mesa {TableId} bloqueada por 5 min para {Client}.", request.RestaurantTableId, request.ClientId);
    return Results.Ok(new { Message = "Mesa bloqueada.", RestaurantTableId = request.RestaurantTableId, ExpiresInSeconds = 300 });
});

// Endpoint de Confirmação
app.MapPost("/api/reservations", async ([FromBody] ReservationDTO reservation, ILogger<Program> logger) =>
{
    // Atualizado para logar o RestaurantTableId
    logger.LogInformation("Recebido pedido de confirmação para a Mesa ID {TableId}", reservation.RestaurantTableId);

    try
    {
        var factory = new ConnectionFactory { HostName = "localhost" };
        await using var connection = await factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();

        await channel.QueueDeclareAsync(queue: "reservation_queue", durable: true, exclusive: false, autoDelete: false, arguments: null);

        string message = JsonSerializer.Serialize(reservation);
        var body = Encoding.UTF8.GetBytes(message);

        await channel.BasicPublishAsync(exchange: string.Empty, routingKey: "reservation_queue", body: body);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Erro crítico no RabbitMQ.");
        return Results.Problem("Erro interno.");
    }

    return Results.Accepted(value: new { Message = "Reserva na fila.", ReservationId = reservation.ReservationId });
});

app.Run();

// DTO atualizado
public record LockRequest(Guid RestaurantTableId, string ClientId);