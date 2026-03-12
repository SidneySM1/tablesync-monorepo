import { Platform } from 'react-native';
import { Restaurant } from '../../entities/restaurant/types';

const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:5271/api' 
  : 'http://localhost:5271/api'; 

export const apiClient = {
  getRestaurants: async (date?: string): Promise<Restaurant[]> => {
    const url = date ? `${BASE_URL}/restaurants?date=${date}` : `${BASE_URL}/restaurants`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao buscar restaurantes');
    return response.json();
  },

  lockTable: async (payload: { restaurantTableId: string, reservationDate: string, clientId: string }) => {
    const response = await fetch(`${BASE_URL}/reservations/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.status === 409) {
      const error = await response.json();
      throw new Error(error.message || 'Horário já reservado');
    }
    
    return response.json();
  },
  
  quickReserve: async (payload: { 
    guestCount: number; 
    clientId: string; 
    sectorId?: string; 
    targetDate?: string 
  }) => {
    const response = await fetch(`${BASE_URL}/reservations/quick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Não encontramos mesas disponíveis para este perfil.');
    }
    
    return response.json();
  }
};