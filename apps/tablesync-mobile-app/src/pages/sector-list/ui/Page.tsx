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
import { confirmReservation } from '@features/confirm-reservation/api/confirm-api';

// UI Components
import { AppModal } from '@shared/ui/modal/AppModal';
import { ReservationConfirmationForm } from '@widgets/reservation-confirmation-form';
import { SectorMapView } from '@widgets/sector-map-view';
import { TimeSlotPicker } from '@widgets/time-slot-picker';

export const SectorListPage = () => {
  const { id } = useLocalSearchParams();
  
  // 1. Obtemos o 'refetch' para atualizar a UI após a reserva no Postgres
  const { restaurants, isLoading, refetch } = useRestaurants();
  
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedDay, setSelectedDay] = useState<ReservationDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  
  const [tempSelectedTable, setTempSelectedTable] = useState<Table | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hook centralizado que gere os estados de bloqueio no Redis
  const { reserveLock, cancelLock, isLocking, activeLock } = useReserveTable();

  const restaurant = useMemo(() => {
    return restaurants.find(r => r.id === id);
  }, [restaurants, id]);

  /**
   * FLUXO 1: Seleção de Horário no Picker
   */
  const handleSlotSelection = async (day: ReservationDay, slot: Slot) => {
    if (!selectedSector) return;

    const token = Crypto.randomUUID();
    
    const result = await reserveLock({
      sectorId: selectedSector.id,
      restaurantTableId: null,
      reservationDate: `${day.date}T${slot.time}:00Z`,
      guestCount: 1,
      reservationToken: token,
    });

    if (result?.action === "OPEN_MAP") {
      setSelectedDay(day);
      setSelectedSlot(slot);
      setViewMode('MAP');
      // Mantemos o selectedSector ativo para não perder o ID no próximo clique
      return;
    }

    if (result) {
      setSelectedDay(day);
      setSelectedSlot(slot);
      setShowSummary(true);
    }
  };

  /**
   * FLUXO 2: Confirmação da Mesa Escolhida no Mapa
   */
  const handleConfirmMapSelection = async () => {
    if (!tempSelectedTable || !selectedDay || !selectedSlot) return;

    // Se o usuário clicar em confirmar na mesa que JÁ está bloqueada por ele
    if (activeLock?.tableId === tempSelectedTable.id) {
      setShowSummary(true);
      return;
    }

    // Tenta o lock da nova mesa (o hook cuidará de cancelar a anterior)
    const result = await reserveLock({
      sectorId: selectedSector?.id || activeLock?.sectorId || '',
      restaurantTableId: tempSelectedTable.id,
      reservationDate: `${selectedDay.date}T${selectedSlot.time}:00Z`,
      guestCount: 1,
      reservationToken: activeLock?.reservationToken || Crypto.randomUUID(),
    });

    if (result) setShowSummary(true);
  };

  /**
   * FLUXO 3: Submissão Final (Checkout para o RabbitMQ)
   */
  const handleFinalSubmit = async (customer: { name: string; phone: string }) => {
    if (!activeLock) return;

    try {
      setIsSubmitting(true);
      
      // Utilizamos o serviço de confirmação que já está configurado com a API base
      await confirmReservation({
        reservationId: Crypto.randomUUID(),
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: "cliente@tablesync.com",
        sectorId: activeLock.sectorId || selectedSector?.id || '',
        restaurantTableId: activeLock.tableId || null,
        guestCount: 1,
        reservationDate: activeLock.reservationDate || '', 
        createdAt: new Date().toISOString(),
        reservationToken: activeLock.reservationToken || ''
      });

      Alert.alert("Reserva Solicitada", "A sua vaga está garantida!");
      setShowSummary(false);
      setViewMode('LIST');
      setTempSelectedTable(null);
      setSelectedSector(null);

      // Sincroniza o telemóvel com o estado real do Postgres
      if (refetch) refetch(); 

    } catch (error) {
      Alert.alert("Erro", "Falha na ligação com o servidor Gateway.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * FLUXO 4: Voltar e Liberar (Limpeza preventiva do Redis)
   */
  const handleGoBack = async () => {
    if (activeLock) await cancelLock();
    setTempSelectedTable(null);
    setViewMode('LIST');
  };

  if (isLoading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>
  );

  if (!restaurant) return (
    <View style={styles.centered}><Text>Restaurante não encontrado.</Text></View>
  );

  // --- RENDER: MODO MAPA ---
  if (viewMode === 'MAP' && selectedSlot) {
    return (
      <View style={styles.container}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar e Liberar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selectedSector?.name || restaurant.name}</Text>
          <Text style={styles.subTitle}>
            {selectedDay?.label} às {selectedSlot.time} — selecione uma mesa
          </Text>
        </View>

        <View style={styles.mapArea}>
          <SectorMapView 
            slot={selectedSlot} 
            selectedTableId={tempSelectedTable?.id || null}
            onSelectTable={setTempSelectedTable} 
          />
        </View>

        <View style={styles.footerBar}>
          <View>
            <Text style={styles.footerTitle}>
              {tempSelectedTable ? `Mesa ${tempSelectedTable.tableNumber}` : 'Nenhuma mesa'}
            </Text>
            <Text style={styles.footerSubtitle}>
              {tempSelectedTable ? `Capacidade: ${tempSelectedTable.capacity} pessoas` : 'Toque no mapa'}
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
             loading={isSubmitting}
             onCancel={async () => { setShowSummary(false); await cancelLock(); setTempSelectedTable(null); }}
             onConfirm={handleFinalSubmit}
           />
        </AppModal>
      </View>
    );
  }

  // --- RENDER: LISTA DE SETORES ---
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

      <AppModal type="center" visible={showSummary} onClose={() => setShowSummary(false)}>
         <ReservationConfirmationForm 
            lockData={activeLock}
            loading={isSubmitting}
            onCancel={async () => { setShowSummary(false); await cancelLock(); }}
            onConfirm={handleFinalSubmit}
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
  mapHeader: { padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  mapArea: { flex: 1 },
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
  btnDisabled: { backgroundColor: '#E5E7EB' },
});