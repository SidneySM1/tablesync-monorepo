using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SharedContracts;
using ReservationWorker.Data;
using ReservationWorker.Entities;

namespace ReservationWorker;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private IConnection? _connection;
    private IChannel? _channel;

    public Worker(ILogger<Worker> logger, IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("⌛ Worker iniciado. Conectando ao RabbitMQ...");

        var factory = new ConnectionFactory { HostName = "localhost" };
        _connection = await factory.CreateConnectionAsync(stoppingToken);
        _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await _channel.QueueDeclareAsync("reservation_queue", durable: true, exclusive: false, autoDelete: false, arguments: null, cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        
        consumer.ReceivedAsync += async (model, ea) =>
        {
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);
            var dto = JsonSerializer.Deserialize<ReservationDTO>(message);

            if (dto != null)
            {
                _logger.LogInformation("✅ Processando reserva {Id} (Mesa {Table})", dto.ReservationId, dto.TableNumber);

                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var novaReserva = new Reservation
                {
                    Id = dto.ReservationId,
                    CustomerName = dto.CustomerName,
                    CustomerEmail = dto.CustomerEmail,
                    CustomerPhone = dto.CustomerPhone,
                    TableNumber = dto.TableNumber,
                    GuestCount = dto.GuestCount,
                    ReservationDate = dto.ReservationDate.ToUniversalTime(), 
                    CreatedAt = dto.CreatedAt.ToUniversalTime()
                };

                db.Reservations.Add(novaReserva);
                await db.SaveChangesAsync(stoppingToken);

                _logger.LogInformation("🚀 [SUCESSO GRAVADO NO BD] Mesa {Table} confirmada para {Name}!", novaReserva.TableNumber, novaReserva.CustomerName);
            }

            await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false, cancellationToken: stoppingToken);
        };

        await _channel.BasicConsumeAsync("reservation_queue", autoAck: false, consumer: consumer, cancellationToken: stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(1000, stoppingToken);
        }
    }

    public override async Task StopAsync(CancellationToken stoppingToken)
    {
        if (_channel is not null) await _channel.CloseAsync(cancellationToken: stoppingToken);
        if (_connection is not null) await _connection.CloseAsync(cancellationToken: stoppingToken);
        await base.StopAsync(stoppingToken);
    }
}