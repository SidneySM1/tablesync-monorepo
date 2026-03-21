export interface ReservationRequest {
	reservationId: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	sectorId: string;
	restaurantTableId: string | null;
	guestCount: number;
	reservationDate: string;
	createdAt: string;
	reservationToken: string;
}

export interface LockResponse {
  action?: string;
  message?: string;
  tableId?: string;
  tableNumber?: number;
  reservationToken?: string;
  sectorId?: string;
  // ADICIONADO: Essencial para o checkout
  reservationDate?: string; 
}