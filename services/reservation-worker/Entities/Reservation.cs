namespace ReservationWorker.Entities;

public class Reservation
{
	public Guid Id { get; set; }
	public string CustomerName { get; set; } = string.Empty;
	public string CustomerEmail { get; set; } = string.Empty;
	public string CustomerPhone { get; set; } = string.Empty;
	public Guid SectorId { get; set; }
	public Guid? RestaurantTableId { get; set; }
	public int GuestCount { get; set; }
	public DateTime ReservationDate { get; set; }
	public DateTime CreatedAt { get; set; }
}