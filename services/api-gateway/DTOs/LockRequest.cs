namespace ApiGateway.DTOs;

public record LockRequest(
    Guid RestaurantTableId, 
    DateTime ReservationDate, 
    string ClientId
);