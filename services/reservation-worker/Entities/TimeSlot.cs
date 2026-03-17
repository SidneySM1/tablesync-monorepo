namespace ReservationWorker.Entities;

public class TimeSlot
{
	public Guid Id { get; set; }
	public Guid SectorId { get; set; } // O novo coração da lógica
	public TimeSpan StartTime { get; set; }
	public TimeSpan EndTime { get; set; }
	public bool IsActive { get; set; } = true;
}