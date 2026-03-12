using Microsoft.EntityFrameworkCore;
using ReservationWorker.Entities;

namespace ReservationWorker.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Restaurant> Restaurants { get; set; }
    public DbSet<Sector> Sectors { get; set; }
    public DbSet<RestaurantTable> RestaurantTables { get; set; }
    public DbSet<Reservation> Reservations { get; set; }
}