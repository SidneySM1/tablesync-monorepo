import { api } from '@shared/api/api-client';
import { useEffect, useState } from 'react';
import { RestaurantResponse } from '../model/types';

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState<RestaurantResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<RestaurantResponse[]>('/restaurants');
      // Garantimos que sempre teremos um array para evitar o crash do .find()
      setRestaurants(res.data || []);
    } catch (err) {
      console.error('[useRestaurants Error]:', err);
      setError('Erro ao carregar dados de Fortaleza.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  return { restaurants, isLoading, error, refetch: fetchRestaurants };
};