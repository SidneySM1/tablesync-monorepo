import { api } from '@shared/api/api-client';
import { useCallback, useEffect, useState } from 'react';
import { RestaurantResponse, Sector } from '../model/types';

export const useSectors = (restaurantId?: string | string[]) => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [restaurantName, setRestaurantName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSectors = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Tipagem como Array de RestaurantResponse
            const response = await api.get<RestaurantResponse[]>('/restaurants');
            
            // Buscamos o restaurante pelo ID que veio da rota
            const restaurant = response.data.find(r => r.id === restaurantId);

            if (restaurant) {
                setSectors(restaurant.sectors);
                setRestaurantName(restaurant.name);
            } else {
                // Se não achar o ID, mas houver dados, pegamos o primeiro por segurança
                const fallback = response.data[0];
                if (fallback) {
                    setSectors(fallback.sectors);
                    setRestaurantName(fallback.name);
                }
            }
        } catch (err) {
            setError('Não foi possível carregar os dados de Fortaleza.');
            console.error('[useSectors Error]:', err);
        } finally {
            setIsLoading(false);
        }
    }, [restaurantId]);

    useEffect(() => {
        fetchSectors();
    }, [fetchSectors]);

    return { sectors, restaurantName, isLoading, error, refetch: fetchSectors };
};