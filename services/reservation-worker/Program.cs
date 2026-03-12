using Microsoft.EntityFrameworkCore;
using ReservationWorker;
using ReservationWorker.Data;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<Worker>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql("Host=localhost;Database=tablesync_db;Username=admin;Password=secretpassword"));

var host = builder.Build();

// == NOVA PARTE: EXECUTAR O SEEDER ANTES DE O WORKER COMEÇAR ==
using (var scope = host.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Garante que o banco está criado e atualizado (roda as migrações automaticamente)
    await db.Database.MigrateAsync(); 
    // Popula com dados falsos se estiver vazio
    await DbSeeder.SeedAsync(db);
}
// =============================================================

host.Run();