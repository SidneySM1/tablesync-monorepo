import { api } from '@shared/api/api-client';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Restaurant } from '../model/types';

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Endpoint único que retorna a árvore completa
    api.get<Restaurant[]>('/restaurants').then(res => {
      const data = res.data;
      setRestaurants(data);
      
      // Se houver apenas 1, pula direto para a página de setores desse ID
      if (data.length === 1) {
        // Usamos replace para não permitir voltar para uma lista vazia
        router.replace({
          pathname: '/sectors/[id]',
          params: { id: data[0].id }
        });
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  return { restaurants, isLoading };
};