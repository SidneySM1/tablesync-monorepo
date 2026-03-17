using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ApiGateway.Data;

[Table("restaurants")] // Permaneceu minúsculo no seeder
public class RestaurantRead 
{ 
	[Column("id")] public Guid Id { get; set; } 
	[Column("name")] public string Name { get; set; } = string.Empty; 

	public ICollection<SectorRead> Sectors { get; set; } = new List<SectorRead>();
}

[Table("Sectors")] // Migration mudou para PascalCase
public class SectorRead 
{ 
	[Column("Id")] public Guid Id { get; set; } 
	[Column("RestaurantId")] public Guid RestaurantId { get; set; } 
	[Column("Name")] public string Name { get; set; } = string.Empty; 
	[Column("HasMapLayout")] public bool HasMapLayout { get; set; } 
	[Column("AllowAnyTable")] public bool AllowAnyTable { get; set; } 
	[Column("TotalCapacity")] public int? TotalCapacity { get; set; } 

	public ICollection<TableRead> Tables { get; set; } = new List<TableRead>();
	public ICollection<TimeSlotRead> TimeSlots { get; set; } = new List<TimeSlotRead>();
}

[Table("restaurant_tables")]
public class TableRead 
{ 
	[Column("id")] public Guid Id { get; set; } 
	[Column("sector_id")] public Guid SectorId { get; set; } 
	[Column("table_number")] public int TableNumber { get; set; } 
	[Column("capacity")] public int Capacity { get; set; } 
	[Column("position_x")] public double PositionX { get; set; } 
	[Column("position_y")] public double PositionY { get; set; } 
}

[Table("Reservations")] // Migration mudou para PascalCase
public class ReservationRead 
{ 
	[Column("Id")] public Guid Id { get; set; } 
	[Column("SectorId")] public Guid SectorId { get; set; } 
	[Column("RestaurantTableId")] public Guid? RestaurantTableId { get; set; } 
	[Column("ReservationDate")] public DateTime ReservationDate { get; set; } 
	[Column("GuestCount")] public int GuestCount { get; set; }
}

[Table("TimeSlots")] // Migration mudou para PascalCase
public class TimeSlotRead
{
	[Column("Id")] public Guid Id { get; set; }
	[Column("SectorId")] public Guid SectorId { get; set; }
	[Column("StartTime")] public TimeSpan StartTime { get; set; }
	[Column("EndTime")] public TimeSpan EndTime { get; set; }
	[Column("IsActive")] public bool IsActive { get; set; }
}

public class ReadOnlyDbContext : DbContext
{
	public ReadOnlyDbContext(DbContextOptions<ReadOnlyDbContext> options) : base(options) { }

	public DbSet<RestaurantRead> Restaurants { get; set; }
	public DbSet<SectorRead> Sectors { get; set; }
	public DbSet<TableRead> Tables { get; set; }
	public DbSet<ReservationRead> Reservations { get; set; }
	public DbSet<TimeSlotRead> TimeSlots { get; set; }

	protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
	{
		optionsBuilder.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
	}

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);

		modelBuilder.Entity<RestaurantRead>()
			.HasMany(r => r.Sectors)
			.WithOne()
			.HasForeignKey(s => s.RestaurantId);

		modelBuilder.Entity<SectorRead>()
			.HasMany(s => s.Tables)
			.WithOne()
			.HasForeignKey(t => t.SectorId);

		modelBuilder.Entity<SectorRead>()
			.HasMany(s => s.TimeSlots)
			.WithOne()
			.HasForeignKey(ts => ts.SectorId);
	}
}