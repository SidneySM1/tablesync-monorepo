using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SharedContracts;

namespace ReservationWorker;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private IConnection? _connection;
    private IChannel? _channel;

    public Worker(ILogger<Worker> logger)
    {
        _logger = logger;
    }

    // Este é o método que o .NET roda automaticamente quando o Worker liga
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("⌛ Worker iniciado. Conectando ao RabbitMQ...");

        var factory = new ConnectionFactory { HostName = "localhost" };
        
        // 1. Criamos a conexão e o canal
        _connection = await factory.CreateConnectionAsync(stoppingToken);
        _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

        // Garantimos que a fila existe (caso o Worker ligue antes da API)
        await _channel.QueueDeclareAsync(queue: "reservation_queue", durable: true, exclusive: false, autoDelete: false, arguments: null, cancellationToken: stoppingToken);

        // 2. Criamos o "Consumidor" assíncrono (O cara que fica escutando a fila)
        var consumer = new AsyncEventingBasicConsumer(_channel);
        
        // 3. O que fazer quando uma mensagem chegar?
        consumer.ReceivedAsync += async (model, ea) =>
        {
            // Pega os bytes da mensagem e transforma de volta no nosso DTO
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);
            var reservation = JsonSerializer.Deserialize<ReservationDTO>(message);

            _logger.LogInformation("✅ [NOVA MENSAGEM] Lendo reserva {Id} para {Name} (Mesa {Table})", 
                reservation?.ReservationId, 
                reservation?.CustomerName, 
                reservation?.TableNumber);

            // AQUI É ONDE A MÁGICA DO BANCO DE DADOS VAI ACONTECER NO FUTURO
            // Por enquanto, vamos simular que ele levou 2 segundos processando a reserva
            await Task.Delay(2000, stoppingToken);

            _logger.LogInformation("🚀 [SUCESSO] Reserva da mesa {Table} processada com sucesso!", reservation?.TableNumber);

            // 4. AVISO IMPORTANTE (Ack): Avisamos o RabbitMQ que terminamos.
            // Se o Worker "crashar" antes dessa linha, o RabbitMQ devolve a mensagem pra fila!
            await _channel.BasicAckAsync(deliveryTag: ea.DeliveryTag, multiple: false, cancellationToken: stoppingToken);
        };

        // Ligamos o consumidor na nossa fila
        await _channel.BasicConsumeAsync(queue: "reservation_queue", autoAck: false, consumer: consumer, cancellationToken: stoppingToken);

        // Mantemos o Worker rodando infinitamente enquanto não cancelarem (Ctrl+C)
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(1000, stoppingToken);
        }
    }

    // Quando desligarmos o Worker, fechamos as conexões bonitinho
    public override async Task StopAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Desligando o Worker e fechando conexões...");
        if (_channel is not null) await _channel.CloseAsync(cancellationToken: stoppingToken);
        if (_connection is not null) await _connection.CloseAsync(cancellationToken: stoppingToken);
        await base.StopAsync(stoppingToken);
    }
}