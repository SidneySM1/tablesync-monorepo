import { useRestaurants } from '@entities/restaurant/api/useRestaurants';
import { Sector } from '@entities/sector/model/types'; // Importe o tipo Sector
import { AppModal } from '@shared/ui/modal/AppModal';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // Adicionado TouchableOpacity

export const SectorListPage = () => {
  const { id } = useLocalSearchParams();
  const { restaurants } = useRestaurants();
  
  // CORREÇÃO: Defina o tipo genérico para o useState aceitar um Sector
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);

  // Encontra o restaurante no array vindo do endpoint único /restaurants
  const restaurant = restaurants.find(r => r.id === id);

  if (!restaurant) return <Text style={styles.loading}>Carregando dados do restaurante...</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.restaurantName}>{restaurant.name}</Text>
      
      {restaurant.sectors.map(sector => (
        <View key={sector.id} style={styles.sectorCard}>
          <View>
            <Text style={styles.sectorTitle}>{sector.name}</Text>
            <Text style={styles.sectorType}>{sector.type}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setSelectedSector(sector)}
          >
             <Text style={styles.buttonText}>Ver Horários</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Modal Bottom: Ação Simples vinda de baixo */}
      <AppModal 
        type="bottom" 
        visible={!!selectedSector} 
        onClose={() => setSelectedSector(null)}
        title={selectedSector?.name}
      >
        <View style={styles.modalContent}>
          <Text>Aqui listaremos os slots de 19h, 21h e 23h conforme o JSON</Text>
          {/* Próximo passo: Renderizar o TimeSlotPicker aqui dentro */}
        </View>
      </AppModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F5F5F5' },
  loading: { marginTop: 50, textAlign: 'center' },
  restaurantName: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  sectorCard: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    elevation: 2 
  },
  sectorTitle: { fontSize: 18, fontWeight: '600' },
  sectorType: { fontSize: 14, color: '#666', textTransform: 'uppercase' },
  button: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  modalContent: { paddingVertical: 10 }
});