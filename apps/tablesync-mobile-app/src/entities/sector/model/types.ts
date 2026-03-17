export type SectorType = 'MAP' | 'AUTO' | 'STANDING';

export interface Table {
	id: string;
	tableNumber: number;
	capacity: number;
	positionX: number; // Coordenada para renderização do mapa
	positionY: number; // Coordenada para renderização do mapa
	isOccupied: boolean; // Calculado pelo backend somando Reservas + Locks no Redis
}

export interface Slot {
	time: string;
	available: boolean;
	remaining?: number; // Presente apenas se o tipo for 'STANDING'
	tables?: Table[];   // Presente apenas se o tipo for 'MAP' ou 'AUTO'
}

export interface ReservationDay {
	date: string;    // Formato "yyyy-MM-dd"
	label: string;   // Formato "dd/MM"
	dayName: string; // Formato "SEG.", "TER.", etc.
	slots: Slot[];
}

export interface Sector {
	id: string;
	name: string;
	type: SectorType; // MAP, AUTO ou STANDING
	days: ReservationDay[];
}

export interface RestaurantResponse {
	name: string;
	sectors: Sector[];
}