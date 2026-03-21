using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SharedContracts;
using ReservationWorker.Data;
using ReservationWorker.Entities;
using Microsoft.EntityFrameworkCore;

namespace ReservationWorker;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private IConnection? _connection;
    private IChannel? _channel;

    // Lógica de JSON centralizada para performance e consistência
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public Worker(ILogger<Worker> logger, IServiceScopeFactory scopeFactory, IConfiguration configuration)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("⌛ Worker iniciado. Aguardando infraestrutura...");

        var factory = new ConnectionFactory()
        {
            HostName = _configuration["RabbitMQ:Host"] ?? "rabbitmq",
            UserName = _configuration["RabbitMQ:Username"] ?? "guest",
            Password = _configuration["RabbitMQ:Password"] ?? "guest"
        };

        while (!stoppingToken.IsCancellationRequested && _connection == null)
        {
            try
            {
                _connection = await factory.CreateConnectionAsync(stoppingToken);
                _logger.LogInformation("✅ Conectado ao RabbitMQ com sucesso!");
            }
            catch (Exception)
            {
                _logger.LogWarning("⚠️ RabbitMQ ainda não está pronto. Tentando novamente em 5s...");
                await Task.Delay(5000, stoppingToken);
            }
        }

        if (_connection == null) return;

        _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);
        await _channel.QueueDeclareAsync("reservation_queue", durable: true, exclusive: false, autoDelete: false, arguments: null, cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        
        consumer.ReceivedAsync += async (model, ea) =>
        {
            try 
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);
                
                // CORREÇÃO: Adicionado _jsonOptions para aceitar camelCase do Mobile
                var dto = JsonSerializer.Deserialize<ReservationDTO>(message, _jsonOptions);

                if (dto != null)
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    var existe = await db.Reservations.AnyAsync(r => r.Id == dto.ReservationId, stoppingToken);
                    
                    if (existe)
                    {
                        _logger.LogWarning("⚠️ Reserva {Id} já existe. Ignorando.", dto.ReservationId);
                        await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
                        return;
                    }

                    var novaReserva = new Reservation
                    {
                        Id = dto.ReservationId,
                        CustomerName = dto.CustomerName,
                        CustomerEmail = dto.CustomerEmail,
                        CustomerPhone = dto.CustomerPhone,
                        SectorId = dto.SectorId,
                        RestaurantTableId = dto.RestaurantTableId,
                        GuestCount = dto.GuestCount,
                        ReservationDate = dto.ReservationDate.ToUniversalTime(), 
                        CreatedAt = dto.CreatedAt.ToUniversalTime()
                    };

                    db.Reservations.Add(novaReserva);
                    await db.SaveChangesAsync(stoppingToken);
                    _logger.LogInformation("🚀 [GRAVADO] Reserva {Id} no Setor {SectorId}", dto.ReservationId, dto.SectorId);
                }

                await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Falha ao processar mensagem. Re-enfileirando...");
                await _channel.BasicNackAsync(ea.DeliveryTag, false, requeue: true, stoppingToken);
            }
        };

        await _channel.BasicConsumeAsync("reservation_queue", false, consumer, stoppingToken);
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    public override async Task StopAsync(CancellationToken stoppingToken)
    {
        if (_channel is not null) await _channel.CloseAsync(stoppingToken);
        if (_connection is not null) await _connection.CloseAsync(stoppingToken);
        await base.StopAsync(stoppingToken);
    }
}