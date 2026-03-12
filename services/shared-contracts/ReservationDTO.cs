namespace SharedContracts;

// Usamos 'record' no lugar de 'class' porque DTOs são apenas para transporte de dados.
// Records são imutáveis por padrão e perfeitos para viajar em filas de mensageria.

public record ReservationDTO(
    Guid ReservationId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone, // Adicionado para o Guest Checkout
    int TableNumber,
    int GuestCount,       // Adicionado para sabermos a lotação
    DateTime ReservationDate,
    DateTime CreatedAt
);