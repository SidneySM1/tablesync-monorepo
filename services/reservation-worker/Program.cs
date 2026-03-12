using Microsoft.EntityFrameworkCore;
using ReservationWorker;
using ReservationWorker.Data;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<Worker>();

// Conexão com o PostgreSQL do seu Docker
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql("Host=localhost;Database=tablesync_db;Username=admin;Password=secretpassword"));

var host = builder.Build();
host.Run();