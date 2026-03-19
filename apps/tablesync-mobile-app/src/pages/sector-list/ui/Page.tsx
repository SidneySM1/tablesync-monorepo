import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// FSD Layers
import { useRestaurants } from '@entities/restaurant/api/useRestaurants';
import { ReservationDay, Sector, Slot, Table } from '@entities/sector';
import { useReserveTable } from '@features/reserve-table';

// UI Components
import { AppModal } from '@shared/ui/modal/AppModal';
import { ReservationConfirmationForm } from '@widgets/reservation-confirmation-form';
import { SectorMapView } from '@widgets/sector-map-view';
import { TimeSlotPicker } from '@widgets/time-slot-picker';

export const SectorListPage = () => {
  const { id } = useLocalSearchParams();
  const { restaurants, isLoading } = useRestaurants();
  
  // Estados de Navegação e Seleção
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedDay, setSelectedDay] = useState<ReservationDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  
  // Estado para a "Mesa Selecionada" antes da confirmação final no rodapé
  const [tempSelectedTable, setTempSelectedTable] = useState<Table | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const { reserveLock, cancelLock, isLocking, activeLock } = useReserveTable();

  // Encontra o restaurante atual
  const restaurant = useMemo(() => {
    return restaurants.find(r => r.id === id);
  }, [restaurants, id]);

  /**
   * FLUXO 1: Seleção de Horário no Picker
   */
  const handleSlotSelection = async (day: ReservationDay, slot: Slot) => {
    if (!selectedSector) return;

    const token = Crypto.randomUUID();
    
    // Tenta o lock inicial (sem mesa ainda)
    const result = await reserveLock({
      sectorId: selectedSector.id,
      restaurantTableId: null,
      reservationDate: `${day.date}T${slot.time}:00Z`,
      guestCount: 1,
      reservationToken: token,
    });

    // Se o C# responder OPEN_MAP (Status 202)
    if (result?.action === "OPEN_MAP") {
      setSelectedDay(day);
      setSelectedSlot(slot);
      setViewMode('MAP');
      setSelectedSector(null); 
      return;
    }

    if (result) {
      // Caso Pista ou Auto (Lock direto)
      setSelectedDay(day);
      setSelectedSlot(slot);
      setSelectedSector(null);
      setShowSummary(true);
    }
  };

  /**
   * FLUXO 2: Confirmação da Mesa Escolhida no Mapa
   */
  const handleConfirmMapSelection = async () => {
    if (!tempSelectedTable || !selectedDay || !selectedSlot) return;

    const result = await reserveLock({
      sectorId: selectedSector?.id || activeLock?.sectorId || '',
      restaurantTableId: tempSelectedTable.id,
      reservationDate: `${selectedDay.date}T${selectedSlot.time}:00Z`,
      guestCount: 1,
      reservationToken: activeLock?.reservationToken || Crypto.randomUUID(),
    });

    if (result) setShowSummary(true);
  };

  if (isLoading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>
  );

  if (!restaurant) return (
    <View style={styles.centered}><Text>Restaurante não encontrado.</Text></View>
  );

  // --- MODO MAPA (Visual do App Antigo) ---
  if (viewMode === 'MAP' && selectedSlot) {
    return (
      <View style={styles.container}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={() => setViewMode('LIST')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selectedSector?.name || restaurant.name}</Text>
          <Text style={styles.subtitle}>
            {selectedDay?.label} às {selectedSlot.time} — toque numa mesa
          </Text>
        </View>

        <View style={styles.mapArea}>
          <SectorMapView 
            slot={selectedSlot} 
            selectedTableId={tempSelectedTable?.id || null}
            onSelectTable={setTempSelectedTable} 
          />
        </View>

        {/* Footer Bar de Confirmação */}
        <View style={styles.footerBar}>
          <View>
            <Text style={styles.footerTitle}>
              {tempSelectedTable ? `Mesa ${tempSelectedTable.tableNumber}` : 'Nenhuma mesa'}
            </Text>
            <Text style={styles.footerSubtitle}>
              {tempSelectedTable ? `Capacidade: ${tempSelectedTable.capacity} pessoas` : 'Selecione para continuar'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.continueButton, (!tempSelectedTable || isLocking) && styles.btnDisabled]}
            disabled={!tempSelectedTable || isLocking}
            onPress={handleConfirmMapSelection}
          >
            {isLocking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.continueButtonText}>Confirmar</Text>}
          </TouchableOpacity>
        </View>

        <AppModal type="center" visible={showSummary} onClose={() => setShowSummary(false)}>
           <ReservationConfirmationForm 
             lockData={activeLock}
             onCancel={async () => { setShowSummary(false); await cancelLock(); }}
             onConfirm={() => { Alert.alert("Sucesso", "Enviado para processamento!"); setShowSummary(false); setViewMode('LIST'); }}
           />
        </AppModal>
      </View>
    );
  }

  // --- MODO LISTA DE SETORES ---
  return (
    <View style={styles.container}>
      <ScrollView style={styles.listContent}>
        <Text style={styles.headerTitle}>{restaurant.name}</Text>
        <Text style={styles.subTitle}>Selecione um setor para reservar:</Text>

        {restaurant.sectors.map((sector) => (
          <TouchableOpacity
            key={sector.id}
            style={styles.sectorCard}
            onPress={() => setSelectedSector(sector)}
          >
            <View style={styles.sectorInfo}>
              <View style={styles.iconBox}>
                {sector.type === 'MAP' && <Ionicons name="layers" size={24} color="#2563EB" />}
                {sector.type === 'AUTO' && <Ionicons name="flash" size={24} color="#FF9500" />}
                {sector.type === 'STANDING' && <Ionicons name="people" size={24} color="#10B981" />}
              </View>
              <View>
                <Text style={styles.sectorName}>{sector.name}</Text>
                <Text style={styles.sectorType}>
                  {sector.type === 'MAP' ? 'Salão VIP (Mapa)' : sector.type === 'AUTO' ? 'Deck (Automático)' : 'Pista (Lotação)'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Picker de Horários (Bottom) */}
      <AppModal
        type="bottom"
        visible={!!selectedSector}
        onClose={() => setSelectedSector(null)}
        title={selectedSector?.name}
      >
        {selectedSector && (
          <TimeSlotPicker sector={selectedSector} onSelectSlot={handleSlotSelection} />
        )}
      </AppModal>

      {/* Modal Final para Pista/Auto */}
      <AppModal type="center" visible={showSummary} onClose={() => setShowSummary(false)}>
         <ReservationConfirmationForm 
            lockData={activeLock}
            onCancel={async () => { setShowSummary(false); await cancelLock(); }}
            onConfirm={() => { Alert.alert("Sucesso", "Reserva em análise!"); setShowSummary(false); }}
         />
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  subTitle: { fontSize: 15, color: '#6B7280', marginBottom: 25, marginTop: 4 },
  
  // Estilo dos Cards (Lista)
  sectorCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5,
  },
  sectorInfo: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sectorName: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  sectorType: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  // Estilo do Mapa (Inspirado no Antigo)
  mapHeader: { padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  mapArea: { flex: 1 },

  // Footer Bar (Igual ao Antigo)
  footerBar: { 
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 35,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10
  },
  footerTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  footerSubtitle: { fontSize: 13, color: '#6B7280' },
  continueButton: { backgroundColor: '#111827', paddingHorizontal: 25, paddingVertical: 14, borderRadius: 12 },
  continueButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  btnDisabled: { backgroundColor: '#E5E7EB' }
});