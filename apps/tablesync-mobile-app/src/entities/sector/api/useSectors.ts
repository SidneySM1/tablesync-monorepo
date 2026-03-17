import { api } from '@shared/api/api-client';
import { useCallback, useEffect, useState } from 'react';
import { RestaurantResponse, Sector } from '../model/types';

export const useSectors = () => {
	const [sectors, setSectors] = useState<Sector[]>([]);
	const [restaurantName, setRestaurantName] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchSectors = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			
			// Chamada ao endpoint que configuramos na Gateway
			const response = await api.get<RestaurantResponse>('/restaurants');
			
			setSectors(response.data.sectors);
			setRestaurantName(response.data.name);
		} catch (err) {
			setError('Não foi possível carregar os setores do restaurante.');
			console.error('[useSectors Error]:', err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSectors();
	}, [fetchSectors]);

	return {
		sectors,
		restaurantName,
		isLoading,
		error,
		refetch: fetchSectors
	};
};