using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReservationWorker.Entities;

[Table("reservations")]
public class Reservation
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [Column("customer_email")]
    public string CustomerEmail { get; set; } = string.Empty;

    [Required]
    [Column("customer_phone")]
    public string CustomerPhone { get; set; } = string.Empty;

    // A MÁGICA: Agora a reserva aponta para a mesa física!
    [Column("restaurant_table_id")]
    public Guid RestaurantTableId { get; set; }
    public RestaurantTable? RestaurantTable { get; set; }

    [Column("guest_count")]
    public int GuestCount { get; set; }

    [Column("reservation_date")]
    public DateTime ReservationDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}