namespace ReservationWorker.Entities;
public class TimeSlot
{
	public Guid Id { get; set; }
	public Guid SectorId { get; set; }
	public Sector? Sector { get; set; }

	public TimeSpan StartTime { get; set; }
	public TimeSpan EndTime { get; set; }
	public bool IsActive { get; set; } = true;
}