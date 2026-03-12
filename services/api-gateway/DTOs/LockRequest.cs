namespace ApiGateway.DTOs;

public record LockRequest(
    Guid RestaurantTableId, 
    DateTime ReservationDate, 
    string ClientId
);

public record QuickReserveRequest(
    int GuestCount,
    string ClientId, 
    Guid? SectorId,
    DateTime? TargetDate
);