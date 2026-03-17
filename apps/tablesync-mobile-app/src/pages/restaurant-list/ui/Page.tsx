import { useRestaurants } from '@entities/restaurant/api/useRestaurants';
import { useRouter } from 'expo-router';
import { FlatList, Text, TouchableOpacity } from 'react-native';

export const RestaurantListPage = () => {
  const { restaurants, isLoading } = useRestaurants();
  const router = useRouter();

  if (isLoading) return <Text>Carregando...</Text>;

  return (
    <FlatList
      data={restaurants}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => router.push(`/sectors/${item.id}`)}>
          <Text style={{ fontSize: 18, padding: 15 }}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
};