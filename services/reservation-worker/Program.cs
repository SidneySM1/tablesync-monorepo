using Microsoft.EntityFrameworkCore;
using ReservationWorker;
using ReservationWorker.Data;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<Worker>();

// CORREÇÃO: Usamos o host 'postgres' (nome do serviço no docker-compose) em vez de 'localhost'
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                      ?? "Host=postgres;Database=tablesync_db;Username=admin;Password=secretpassword";

builder.Services.AddDbContext<AppDbContext>(options =>
	options.UseNpgsql(connectionString));

var host = builder.Build();

if (args.Contains("seed"))
{
	using var scope = host.Services.CreateScope();
	var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
	
	Console.WriteLine("🌱 Iniciando Seeder...");
	await DbSeeder.SeedAsync(db);
	Console.WriteLine("✅ Banco populado com sucesso!");
	return;
}

host.Run();