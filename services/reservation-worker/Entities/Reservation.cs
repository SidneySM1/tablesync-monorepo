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

    [Column("table_number")]
    public int TableNumber { get; set; }

    [Column("guest_count")]
    public int GuestCount { get; set; }

    [Column("reservation_date")]
    public DateTime ReservationDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}