export interface LockRequest {
	sectorId: string;
	restaurantTableId: string | null; // null para Pista ou Alocação Automática
	reservationDate: string; // ISO String
	guestCount: number;
	reservationToken: string; // O UUID gerado no App para a sessão
}

export interface LockResponse {
  action?: string;   // Ex: "OPEN_MAP"
  message?: string;  // Mensagem vinda do C#
  tableId?: string;  // UUID da mesa (se houver)
  tableNumber?: number;
  reservationToken?: string; // Adicionamos aqui para o state guardar o token usado
  sectorId?: string;
}