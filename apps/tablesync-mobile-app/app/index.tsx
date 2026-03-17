import { RestaurantResponse } from '@entities/restaurant/model/types';
import { api } from '@shared/api/api-client';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

export default function IndexPage() {
  const [data, setData] = useState<RestaurantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log('Buscando restaurantes...');
  api.get<RestaurantResponse[]>('/restaurants')
    .then(res => {

      const restaurants = res.data;
      console.log('Restaurantes recebidos:', restaurants);
      if (restaurants && restaurants.length === 1) {
        const first = restaurants[0];

        // Garantimos que ID e Name existam antes de navegar
        if (first.id && first.name) {
          router.replace({
            pathname: '/(drawer)/sectors/[id]',
            params: { 
              id: first.id, 
              name: first.name 
            }
          });
        }
      } else {
        setData(restaurants || []);
      }
    })
    .finally(() => setLoading(false));
}, []);

  if (loading) {
    return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" /></View>;
  }

  // Se chegou aqui, é porque restaurants.length > 1 ou 0
  return (
    <FlatList
      data={data}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity 
          onPress={() => router.push({ pathname: '/(drawer)/sectors/[id]', params: { id: item.id, name: item.name }})}
          style={{ padding: 20, borderBottomWidth: 1, borderColor: '#eee' }}
        >
          <Text style={{ fontSize: 18 }}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}