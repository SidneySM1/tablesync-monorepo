export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isOccupied: boolean;
}

export interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  positionX: number;
  positionY: number;
  timeSlots: TimeSlot[];
}

export interface Sector {
  id: string;
  name: string;
  hasMapLayout: boolean;
  allowAnyTable: boolean;
  tables: Table[];
}

export interface Restaurant {
  id: string;
  name: string;
  sectors: Sector[];
}