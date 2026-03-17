namespace ReservationWorker.Entities;

public class Sector
{
	public Guid Id { get; set; }
	public Guid RestaurantId { get; set; }
	public string Name { get; set; } = string.Empty;
	public bool HasMapLayout { get; set; }
	public bool AllowAnyTable { get; set; }
	
	// Capacidade Total (Obrigatório para Pista/Boate, opcional para mesas)
	public int? TotalCapacity { get; set; } 

	public ICollection<RestaurantTable> Tables { get; set; } = new List<RestaurantTable>();
	public ICollection<TimeSlot> TimeSlots { get; set; } = new List<TimeSlot>();
}