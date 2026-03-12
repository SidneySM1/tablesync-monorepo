using Microsoft.AspNetCore.Mvc;
using SharedContracts;
using RabbitMQ.Client; // Biblioteca do RabbitMQ (Versão 7+)
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "TableSync API Gateway rodando com sucesso!");

// NOTA: Adicionamos o 'async' aqui na definição do endpoint
app.MapPost("/api/reservations", async ([FromBody] ReservationDTO reservation, ILogger<Program> logger) =>
{
    logger.LogInformation("Recebido pedido de reserva para a Mesa {TableNumber} do cliente {CustomerName}", 
        reservation.TableNumber, 
        reservation.CustomerName);

    try
    {
        var factory = new ConnectionFactory { HostName = "localhost" };
        
        // 1. Criar conexão e canal de forma Assíncrona (Padrão V7)
        await using var connection = await factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();

        // 2. Declarar a fila assincronamente
        await channel.QueueDeclareAsync(
            queue: "reservation_queue",
            durable: true, 
            exclusive: false,
            autoDelete: false,
            arguments: null);

        // 3. Preparar a mensagem
        string message = JsonSerializer.Serialize(reservation);
        var body = Encoding.UTF8.GetBytes(message);

        // 4. Publicar assincronamente
        await channel.BasicPublishAsync(
            exchange: string.Empty,
            routingKey: "reservation_queue",
            body: body);

        logger.LogInformation("Mensagem enviada com sucesso para a fila 'reservation_queue'!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Erro crítico ao comunicar com o RabbitMQ.");
        return Results.Problem("Não foi possível processar a reserva neste momento. Tente novamente mais tarde.");
    }

    return Results.Accepted(value: new { 
        Message = "Sua reserva está na fila de processamento.",
        ReservationId = reservation.ReservationId 
    });
});

app.Run();