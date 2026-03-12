using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReservationWorker.Entities;

[Table("time_slots")]
public class TimeSlot
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("restaurant_table_id")]
    public Guid RestaurantTableId { get; set; }
    public RestaurantTable? RestaurantTable { get; set; }

    // Representa a hora de início (ex: 18:00:00)
    [Column("start_time")]
    public TimeSpan StartTime { get; set; }

    // Representa a hora de término (ex: 20:00:00)
    [Column("end_time")]
    public TimeSpan EndTime { get; set; }

    // O dono do restaurante pode desativar um horário específico sem precisar deletar
    [Column("is_active")]
    public bool IsActive { get; set; } = true;
}