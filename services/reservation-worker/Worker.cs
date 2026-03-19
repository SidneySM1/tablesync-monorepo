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
	private IConnection? _connection;
	private IChannel? _channel;

	private readonly IConfiguration _configuration;

	public Worker(ILogger<Worker> logger, IServiceScopeFactory scopeFactory, IConfiguration configuration)
	{
		_logger = logger;
		_scopeFactory = scopeFactory;
		_configuration = configuration;
	}

	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		_logger.LogInformation("⌛ Worker iniciado. Conectando ao RabbitMQ...");

		// var factory = new ConnectionFactory { HostName = "localhost" };
		var factory = new ConnectionFactory()
        {
            HostName = _configuration["RabbitMQ:Host"] ?? "localhost",
            UserName = _configuration["RabbitMQ:Username"] ?? "guest",
            Password = _configuration["RabbitMQ:Password"] ?? "guest"
        };
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
				using var scope = _scopeFactory.CreateScope();
				var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

				// 1. IDEMPOTÊNCIA (Essencial para não duplicar reserva se o RabbitMQ falhar)
				var existe = await db.Reservations.AnyAsync(r => r.Id == dto.ReservationId, stoppingToken);
				
				if (existe)
				{
					_logger.LogWarning("⚠️ Reserva {Id} já existe. Ignorando.", dto.ReservationId);
					await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
					return;
				}

				// 2. MAPEAMENTO HÍBRIDO (Mesa ou Setor/Pista)
				var novaReserva = new Reservation
				{
					Id = dto.ReservationId,
					CustomerName = dto.CustomerName,
					CustomerEmail = dto.CustomerEmail,
					CustomerPhone = dto.CustomerPhone,
					SectorId = dto.SectorId,
					RestaurantTableId = dto.RestaurantTableId, // NULL se for STANDING
					GuestCount = dto.GuestCount,
					ReservationDate = dto.ReservationDate.ToUniversalTime(), 
					CreatedAt = dto.CreatedAt.ToUniversalTime()
				};

				try 
				{
					db.Reservations.Add(novaReserva);
					await db.SaveChangesAsync(stoppingToken);
					_logger.LogInformation("🚀 [GRAVADO] Reserva {Id} no Setor {SectorId}", dto.ReservationId, dto.SectorId);
				}
				catch (Exception ex)
				{
					_logger.LogError(ex, "❌ Falha ao gravar reserva {Id}", dto.ReservationId);
					return; // Não dá o Ack para tentar novamente
				}
			}

			await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
		};

		await _channel.BasicConsumeAsync("reservation_queue", false, consumer, stoppingToken);

		while (!stoppingToken.IsCancellationRequested)
		{
			await Task.Delay(1000, stoppingToken);
		}
	}

	public override async Task StopAsync(CancellationToken stoppingToken)
	{
		if (_channel is not null) await _channel.CloseAsync(stoppingToken);
		if (_connection is not null) await _connection.CloseAsync(stoppingToken);
		await base.StopAsync(stoppingToken);
	}
}