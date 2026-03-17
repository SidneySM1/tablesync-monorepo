export interface ReservationRequest {
	reservationId: string;    // Guid gerado no App
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	sectorId: string;         // Obrigatório na nova arquitetura
	restaurantTableId: string | null; // null se for STANDING
	guestCount: number;
	reservationDate: string;  // ISO String
	createdAt: string;        // ISO String
	reservationToken: string; // O token usado no /lock para validar a posse
}