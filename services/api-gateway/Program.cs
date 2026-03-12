using Microsoft.AspNetCore.Mvc;
using SharedContracts;
using RabbitMQ.Client;
using StackExchange.Redis; // O poder do Redis
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// 1. Conectando ao Redis (Singleton garante que a conexão fica aberta e super rápida)
builder.Services.AddSingleton<IConnectionMultiplexer>(sp => 
    ConnectionMultiplexer.Connect("localhost:6379"));

var app = builder.Build();

app.MapGet("/", () => "TableSync API Gateway rodando com sucesso!");

// ==============================================================================
// NOVO ENDPOINT: PASSO 1 DO APP - BLOQUEAR A MESA TEMPORARIAMENTE
// ==============================================================================
app.MapPost("/api/reservations/lock", async ([FromBody] LockRequest request, IConnectionMultiplexer redis, ILogger<Program> logger) =>
{
    var db = redis.GetDatabase();
    string lockKey = $"mesa:{request.TableNumber}:bloqueada";

    // A MÁGICA ACONTECE AQUI:
    // Tenta criar a chave. O "When.NotExists" garante que, se 10 pessoas tentarem 
    // rodar essa linha no mesmo milissegundo, o Redis só vai dizer "Sim (true)" para a primeira!
    bool acquired = await db.StringSetAsync(
        lockKey, 
        request.ClientId, 
        TimeSpan.FromMinutes(5), // O famoso TTL (destrói em 5 minutos)
        When.NotExists
    );

    if (!acquired)
    {
        logger.LogWarning("Bloqueio negado: Mesa {Table} já está em uso.", request.TableNumber);
        // Retorna status 409 Conflict para o celular pintar a mesa de vermelho
        return Results.Conflict(new { Message = "Esta mesa acabou de ser selecionada por outro cliente." });
    }

    logger.LogInformation("Mesa {Table} bloqueada com sucesso por 5 min para o cliente {Client}.", request.TableNumber, request.ClientId);
    // Retorna status 200 OK para o celular iniciar o cronômetro
    return Results.Ok(new { 
        Message = "Mesa bloqueada.", 
        TableNumber = request.TableNumber, 
        ExpiresInSeconds = 300 
    });
});

// ==============================================================================
// ENDPOINT EXISTENTE: PASSO 2 DO APP - CONFIRMAR A RESERVA (RABBITMQ)
// ==============================================================================
app.MapPost("/api/reservations", async ([FromBody] ReservationDTO reservation, ILogger<Program> logger) =>
{
    // ... (Este é o exato mesmo código do RabbitMQ que já tínhamos feito)
    logger.LogInformation("Recebido pedido de confirmação para a Mesa {TableNumber}", reservation.TableNumber);

    try
    {
        var factory = new ConnectionFactory { HostName = "localhost" };
        await using var connection = await factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();

        await channel.QueueDeclareAsync(queue: "reservation_queue", durable: true, exclusive: false, autoDelete: false, arguments: null);

        string message = JsonSerializer.Serialize(reservation);
        var body = Encoding.UTF8.GetBytes(message);

        await channel.BasicPublishAsync(exchange: string.Empty, routingKey: "reservation_queue", body: body);

        logger.LogInformation("Confirmação enviada para a fila!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Erro crítico no RabbitMQ.");
        return Results.Problem("Erro interno.");
    }

    return Results.Accepted(value: new { Message = "Reserva na fila.", ReservationId = reservation.ReservationId });
});

app.Run();

// DTO super leve apenas para a requisição de Lock
public record LockRequest(int TableNumber, string ClientId);