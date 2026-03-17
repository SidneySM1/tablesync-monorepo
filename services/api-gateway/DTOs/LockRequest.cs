namespace ApiGateway.DTOs;

public record LockRequest(
	Guid SectorId, 
	Guid? RestaurantTableId, 
	DateTime ReservationDate, 
	int GuestCount, 
	string ReservationToken
);

public record QuickReserveRequest(
	int GuestCount,
	string ReservationToken, 
	Guid? SectorId = null,
	DateTime? TargetDate = null
);