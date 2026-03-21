export interface LockRequest {
  sectorId: string;
  restaurantTableId: string | null;
  reservationDate: string; 
  guestCount: number;
  reservationToken: string; 
}

export interface LockResponse {
  action?: string;   
  message?: string;  
  tableId?: string;  
  tableNumber?: number;
  reservationToken?: string; 
  sectorId?: string;
  // ADICIONE ESTA LINHA ABAIXO:
  reservationDate?: string; // ISO String vinda do C#
}