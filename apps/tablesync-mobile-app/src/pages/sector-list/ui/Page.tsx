import { useRestaurants } from '@entities/restaurant/api/useRestaurants';
import { ReservationDay, Sector, Slot } from '@entities/sector/model/types';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from '@shared/ui/modal/AppModal';
import { TimeSlotPicker } from '@widgets/time-slot-picker/ui/TimeSlotPicker';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const SectorListPage = () => {
  const { id } = useLocalSearchParams();
  const { restaurants, isLoading } = useRestaurants();
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);

  const handleSlotSelection = (day: ReservationDay, slot: Slot) => {
    console.log(`Selecionado: ${day.date} às ${slot.time} no setor ${selectedSector?.name}`);
    // Próximo passo: disparar o lockResource da feature!
  };

  // Memoizamos a busca para performance e para evitar o crash de 'undefined'
  const restaurant = useMemo(() => {
    return restaurants.find(r => r.id === id);
  }, [restaurants, id]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Buscando setores...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.center}>
        <Text>Restaurante não encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>{restaurant.name}</Text>
      <Text style={styles.subTitle}>Escolha um setor para reservar:</Text>

      {restaurant.sectors.map((sector) => (
        <TouchableOpacity
          key={sector.id}
          style={styles.sectorCard}
          onPress={() => setSelectedSector(sector)}
        >
          <View style={styles.sectorInfo}>
            <View style={styles.iconContainer}>
              {/* Ícones baseados no tipo do setor */}
              {sector.type === 'MAP' && <Ionicons name="layers" size={24} color="#007AFF" />}
              {sector.type === 'AUTO' && <Ionicons name="flash" size={24} color="#FF9500" />}
              {sector.type === 'STANDING' && <Ionicons name="people" size={24} color="#34C759" />}
            </View>
            <View>
              <Text style={styles.sectorName}>{sector.name}</Text>
              <Text style={styles.sectorType}>
                {sector.type === 'MAP' ? 'Mapa de Mesas' : sector.type === 'AUTO' ? 'Alocação Automática' : 'Pista / Lotação'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      ))}

      {/* Modal de Ação Simples (Bottom) */}
      <AppModal
        type="bottom"
        visible={!!selectedSector}
        onClose={() => setSelectedSector(null)}
        title={selectedSector?.name}
      >
        {selectedSector && (
          <TimeSlotPicker
            sector={selectedSector}
            onSelectSlot={handleSlotSelection}
          />
        )}
      </AppModal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  subTitle: { fontSize: 16, color: '#666', marginBottom: 20, marginTop: 4 },
  sectorCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectorInfo: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectorName: { fontSize: 18, fontWeight: '600', color: '#333' },
  sectorType: { fontSize: 13, color: '#888', marginTop: 2 },
  modalBody: { paddingBottom: 20 },
  modalText: { fontSize: 16, marginBottom: 15, color: '#444' }
});