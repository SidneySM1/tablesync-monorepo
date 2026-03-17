import { Sector } from '@entities/sector/model/types';

export interface Restaurant {
  id: string;
  name: string;
  sectors: Sector[];
}