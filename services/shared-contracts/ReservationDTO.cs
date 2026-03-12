namespace SharedContracts;

public record ReservationDTO(
    Guid ReservationId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    Guid RestaurantTableId,
    int GuestCount,
    DateTime ReservationDate,
    DateTime CreatedAt
);