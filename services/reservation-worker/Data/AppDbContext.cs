using Microsoft.EntityFrameworkCore;
using ReservationWorker.Entities;

namespace ReservationWorker.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Reservation> Reservations { get; set; }
}