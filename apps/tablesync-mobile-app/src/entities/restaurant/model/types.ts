import { Sector } from '@entities/sector/model/types';

// O seu log mostrou que a API retorna um OBJETO único, não um array
export interface RestaurantResponse {
  name: string;
  sectors: Sector[];
  // Adicione 'id' aqui se o seu backend puder retornar futuramente
  id: string; 
}