import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Layers - FSD Architecture
import { useRestaurants } from '@entities/restaurant/api/useRestaurants';
import { ReservationDay, Sector, Slot, Table } from '@entities/sector';
import { useReserveTable } from '@features/reserve-table';

// UI Widgets & Shared
import { AppModal } from '@shared/ui/modal/AppModal';
import { ReservationConfirmationForm } from '@widgets/reservation-confirmation-form';
import { SectorMapView } from '@widgets/sector-map-view';
import { TimeSlotPicker } from '@widgets/time-slot-picker';

export const SectorListPage = () => {
  const { id } = useLocalSearchParams();
  const { restaurants, isLoading } = useRestaurants();
  
  // Estados de Navegação e Modais
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedDay, setSelectedDay] = useState<ReservationDay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Feature Hook para gestão de concorrência
  const { reserveLock, cancelLock, isLocking, activeLock } = useReserveTable();

  // Localiza o restaurante selecionado no array de dados
  const restaurant = useMemo(() => {
    return restaurants.find(r => r.id === id);
  }, [restaurants, id]);

  /**
   * Passo 1: Seleção de Slot de Horário
   * Inicia o processo de bloqueio no servidor.
   */
  const handleSlotSelection = async (day: ReservationDay, slot: Slot) => {
    if (!selectedSector) return;

    const token = Crypto.randomUUID();
    
    // Tentativa inicial de bloqueio (sem mesa definida)
    const result = await reserveLock({
      sectorId: selectedSector.id,
      restaurantTableId: null,
      reservationDate: `${day.date}T${slot.time}:00Z`,
      guestCount: 1,
      reservationToken: token,
    });

    // Se a API retornar a ação de abrir mapa (ex: Setor VIP)
    if (result?.action === "OPEN_MAP") {
      setSelectedDay(day);
      setSelectedSlot(slot);
      setViewMode('MAP');
      setSelectedSector(null); 
      return;
    }

    // Se o bloqueio for direto (Pista ou Alocação Automática)
    if (result) {
      setSelectedDay(day);
      setSelectedSlot(slot);
      setSelectedSector(null);
      setShowSummary(true);
    }
  };

  /**
   * Passo 2: Seleção de Mesa no Mapa
   * Chamado apenas quando o utilizador seleciona uma mesa específica no layout.
   */
  const handleTableSelection = async (table: Table) => {
    if (!selectedSector || !selectedDay || !selectedSlot) return;

    // Realiza o bloqueio da mesa escolhida mantendo o mesmo token
    const result = await reserveLock({
      sectorId: selectedSector.id,
      restaurantTableId: table.id,
      reservationDate: `${selectedDay.date}T${selectedSlot.time}:00Z`,
      guestCount: 1,
      reservationToken: activeLock?.reservationToken || Crypto.randomUUID(),
    });

    if (result) {
      setShowSummary(true);
    }
  };

  /**
   * Passo 3: Submissão Final
   * Envia os dados do cliente e o token de bloqueio para processamento.
   */
  const handleFinalSubmit = async (customer: { name: string; phone: string }) => {
    // Aqui será feita a chamada final para criar a reserva
    console.log("A enviar reserva final:", { customer, activeLock });
    Alert.alert("Sucesso", "A sua reserva está a ser processada!");
    setShowSummary(false);
    setViewMode('LIST');
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>A carregar setores...</Text>
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

  // --- RENDERIZAÇÃO: MODO MAPA ---
  if (viewMode === 'MAP' && selectedSlot) {
    return (
      <View style={styles.mapContainer}>
        <TouchableOpacity style={styles.backLink} onPress={() => setViewMode('LIST')}>
          <Ionicons name="arrow-back" size={20} color="#007AFF" />
          <Text style={styles.backLinkText}>Voltar para Setores</Text>
        </TouchableOpacity>
        
        <SectorMapView 
          slot={selectedSlot} 
          onSelectTable={handleTableSelection} 
          isLocking={isLocking}
        />

        <AppModal type="center" visible={showSummary} onClose={() => setShowSummary(false)}>
           <ReservationConfirmationForm 
             lockData={activeLock}
             onCancel={async () => { 
               setShowSummary(false); 
               await cancelLock(); // Libera o recurso no servidor
             }}
             onConfirm={handleFinalSubmit}
           />
        </AppModal>
      </View>
    );
  }

  // --- RENDERIZAÇÃO: MODO LISTA DE SETORES ---
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.headerTitle}>{restaurant.name}</Text>
        <Text style={styles.subTitle}>Selecione um setor para reservar:</Text>

        {restaurant.sectors.map((sector) => (
          <TouchableOpacity
            key={sector.id}
            style={styles.sectorCard}
            onPress={() => setSelectedSector(sector)}
          >
            <View style={styles.sectorInfo}>
              <View style={styles.iconContainer}>
                {sector.type === 'MAP' && <Ionicons name="layers" size={24} color="#007AFF" />}
                {sector.type === 'AUTO' && <Ionicons name="flash" size={24} color="#FF9500" />}
                {sector.type === 'STANDING' && <Ionicons name="people" size={24} color="#34C759" />}
              </View>
              <View>
                <Text style={styles.sectorName}>{sector.name}</Text>
                <Text style={styles.sectorType}>
                  {sector.type === 'MAP' ? 'Salão VIP (Mapa)' : sector.type === 'AUTO' ? 'Deck (Automático)' : 'Pista (Lotação)'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal de Horários (Bottom) */}
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

      {/* Modal de Confirmação (Central - Fluxo Pista/Auto) */}
      <AppModal type="center" visible={showSummary} onClose={() => setShowSummary(false)}>
         <ReservationConfirmationForm 
            lockData={activeLock}
            onCancel={async () => { 
              setShowSummary(false); 
              await cancelLock(); 
            }}
            onConfirm={handleFinalSubmit}
         />
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingText: { marginTop: 10, color: '#666' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  subTitle: { fontSize: 16, color: '#666', marginBottom: 24, marginTop: 4 },
  sectorCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  sectorInfo: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sectorName: { fontSize: 18, fontWeight: '700', color: '#333' },
  sectorType: { fontSize: 13, color: '#999', marginTop: 2 },
  mapContainer: { flex: 1, padding: 16, backgroundColor: '#F8F9FA' },
  backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  backLinkText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 }
});