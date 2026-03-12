using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReservationWorker.Entities;

[Table("restaurant_tables")]
public class RestaurantTable
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("sector_id")]
    public Guid SectorId { get; set; }
    public Sector? Sector { get; set; }

    [Column("table_number")]
    public int TableNumber { get; set; }

    [Column("capacity")]
    public int Capacity { get; set; }

    // Usamos 'double' para as coordenadas (ex: 45.5% da tela)
    [Column("position_x")]
    public double PositionX { get; set; }

    [Column("position_y")]
    public double PositionY { get; set; }
}