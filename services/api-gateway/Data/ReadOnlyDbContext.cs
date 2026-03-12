using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ApiGateway.Data;

[Table("restaurants")]
public class RestaurantRead 
{ 
    [Column("id")] public Guid Id { get; set; } 
    [Column("name")] public string Name { get; set; } = string.Empty; 
}

[Table("sectors")]
public class SectorRead 
{ 
    [Column("id")] public Guid Id { get; set; } 
    [Column("restaurant_id")] public Guid RestaurantId { get; set; } 
    [Column("name")] public string Name { get; set; } = string.Empty; 
    [Column("has_map_layout")] public bool HasMapLayout { get; set; } 
    [Column("allow_any_table")] public bool AllowAnyTable { get; set; } 
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

[Table("reservations")]
public class ReservationRead 
{ 
    [Column("id")] public Guid Id { get; set; } 
    [Column("restaurant_table_id")] public Guid RestaurantTableId { get; set; } 
    [Column("reservation_date")] public DateTime ReservationDate { get; set; } 
}

[Table("time_slots")]
public class TimeSlotRead
{
    [Column("id")] public Guid Id { get; set; }
    [Column("restaurant_table_id")] public Guid RestaurantTableId { get; set; }
    [Column("start_time")] public TimeSpan StartTime { get; set; }
    [Column("end_time")] public TimeSpan EndTime { get; set; }
    [Column("is_active")] public bool IsActive { get; set; }
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
}
