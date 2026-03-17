using Microsoft.EntityFrameworkCore;
using ReservationWorker.Entities;

namespace ReservationWorker.Data;

public class AppDbContext : DbContext
{
	public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

	public DbSet<Restaurant> Restaurants { get; set; }
	public DbSet<Sector> Sectors { get; set; }
	
	// O Seeder procura por 'Tables'. Se aqui estiver 'RestaurantTables', o erro ocorre.
	public DbSet<RestaurantTable> Tables { get; set; } 
	
	public DbSet<Reservation> Reservations { get; set; }
	public DbSet<TimeSlot> TimeSlots { get; set; }

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);

		// Mapeamento explícito para garantir que o EF saiba lidar com as tabelas PascalCase ou snake_case
		modelBuilder.Entity<RestaurantTable>().ToTable("restaurant_tables");
		modelBuilder.Entity<Sector>().ToTable("Sectors");
		modelBuilder.Entity<Reservation>().ToTable("Reservations");
		modelBuilder.Entity<TimeSlot>().ToTable("TimeSlots");
		modelBuilder.Entity<Restaurant>().ToTable("restaurants");
	}
}