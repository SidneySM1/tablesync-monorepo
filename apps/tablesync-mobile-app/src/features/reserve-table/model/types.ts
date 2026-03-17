export interface LockRequest {
	sectorId: string;
	restaurantTableId: string | null; // null para Pista ou Alocação Automática
	reservationDate: string; // ISO String
	guestCount: number;
	reservationToken: string; // O UUID gerado no App para a sessão
}

export interface LockResponse {
	message: string;
	tableId?: string; // O Backend preenche se for AUTO
	expiresIn: number;
}