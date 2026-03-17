using Microsoft.EntityFrameworkCore;
using ReservationWorker;
using ReservationWorker.Data;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<Worker>();

builder.Services.AddDbContext<AppDbContext>(options =>
	options.UseNpgsql("Host=localhost;Database=tablesync_db;Username=admin;Password=secretpassword"));

var host = builder.Build();

// == LÓGICA DE CLI: SEEDER SOB DEMANDA ==
if (args.Contains("seed"))
{
	using var scope = host.Services.CreateScope();
	var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
	
	Console.WriteLine("🌱 Iniciando Seeder...");
	// O seeder agora roda de forma limpa apenas quando você pede
	await DbSeeder.SeedAsync(db);
	Console.WriteLine("✅ Banco populado com sucesso!");
	
	return; // Encerra sem subir o Worker
}

host.Run();