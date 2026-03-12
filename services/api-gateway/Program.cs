using Microsoft.AspNetCore.Mvc;
using SharedContracts;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Rota de teste simples para sabermos que a API subiu
app.MapGet("/", () => "TableSync API Gateway rodando com sucesso!");

// O endpoint principal que o seu App em React Native vai chamar
app.MapPost("/api/reservations", ([FromBody] ReservationDTO reservation, ILogger<Program> logger) =>
{
    // 1. A API recebe o JSON e o .NET converte automaticamente para o ReservationDTO.
    
    // 2. Registramos no terminal para você ver a mágica acontecendo
    logger.LogInformation("Recebido pedido de reserva para a Mesa {TableNumber} do cliente {CustomerName}", 
        reservation.TableNumber, 
        reservation.CustomerName);

    // 3. (AQUI ENTRARÁ O CÓDIGO DO RABBITMQ NO PRÓXIMO PASSO)

    // 4. Retornamos o status HTTP 202 (Accepted). 
    // Isso diz ao celular: "Recebi seu pedido, está na fila, mas ainda não terminei de processar."
    return Results.Accepted(value: new { 
        Message = "Sua reserva está na fila de processamento.",
        ReservationId = reservation.ReservationId 
    });
});

app.Run();