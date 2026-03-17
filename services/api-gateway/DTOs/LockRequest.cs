namespace ApiGateway.DTOs;

public record LockRequest(
	Guid SectorId, 
	Guid? RestaurantTableId, 
	DateTime ReservationDate, 
	int GuestCount, 
	string ReservationToken
);