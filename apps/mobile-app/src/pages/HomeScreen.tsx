import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { Restaurant, Sector } from '../entities/restaurant/types';
import { apiClient } from '../shared/api/api';
import { CustomAlert, AlertType } from '../shared/ui/CustomAlert';

const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

const formatDateVisual = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return { iso: isoDate, dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase(), dayNum: d };
};

export const HomeScreen = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showQuickReserve, setShowQuickReserve] = useState(false);
  const [quickGuestCount, setQuickGuestCount] = useState(2);
  const [isQuickReserving, setIsQuickReserving] = useState(false);
  const [reservationResult, setReservationResult] = useState<any>(null);

  const [showSectorReserve, setShowSectorReserve] = useState(false);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [sectorGuestCount, setSectorGuestCount] = useState(2);
  
  const [availableDates, setAvailableDates] = useState<{iso: string, dayName: string, dayNum: string}[] | null>(null);
  const [isSearchingDates, setIsSearchingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<{time: string, tableId: string}[] | null>(null);
  const [isSearchingTimes, setIsSearchingTimes] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ type: 'success' as AlertType, title: '', message: '' });

  const isMapSector = selectedSector?.hasMapLayout;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getRestaurants();
      setRestaurants(data);
    } catch (err) {
      setError('Erro ao carregar os dados da API.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReserve = async () => {
    try {
      setIsQuickReserving(true);
      const result = await apiClient.quickReserve({ guestCount: quickGuestCount, clientId: 'cliente-mobile-123' });
      setReservationResult({
        restaurantTableId: result.restaurantTableId,
        formattedDate: result.formattedDate,
        time: result.time,
        sectorName: result.sectorName,
        tableCapacity: result.tableCapacity ?? quickGuestCount,
      });
      setShowQuickReserve(false);
      setAlertConfig({ type: 'success', title: 'Mesa Encontrada! 🎉', message: `Ambiente: ${result.sectorName}\nData: ${result.formattedDate}\nHorário: ${result.time}\n\nBloqueámos a mesa para si.` });
      setAlertVisible(true);
    } catch (error: any) {
      setAlertConfig({ type: 'error', title: 'Lotação Máxima', message: error.message });
      setAlertVisible(true);
    } finally {
      setIsQuickReserving(false);
    }
  };

  const handleSearchDates = async () => {
    if (!selectedSector) return;
    try {
      setIsSearchingDates(true);
      setAvailableTimes(null);
      setSelectedDate(null);
      const dates = await apiClient.getAvailableDates(selectedSector.id, sectorGuestCount);
      
      if (dates.length === 0) {
        setAlertConfig({ type: 'warning', title: 'Esgotado', message: `Não temos disponibilidade para ${sectorGuestCount} pessoas nos próximos dias.` });
        setAlertVisible(true);
      } else {
        setAvailableDates(dates.map(formatDateVisual));
      }
    } catch (error) {
      setAlertConfig({ type: 'error', title: 'Erro', message: 'Falha ao buscar datas.' });
      setAlertVisible(true);
    } finally {
      setIsSearchingDates(false);
    }
  };

  const handleSelectDate = async (isoDate: string) => {
    if (!selectedSector) return;
    setSelectedDate(isoDate);
    
    // SE TEM MAPA: Navega imediatamente apenas com a data!
    if (selectedSector.hasMapLayout) {
      setShowSectorReserve(false);
      router.push({ pathname: `/map/${selectedSector.id}`, params: { date: isoDate } });
      return;
    }

    try {
      setIsSearchingTimes(true);
      const data = await apiClient.getRestaurants(isoDate);
      const sector = data[0].sectors.find(s => s.id === selectedSector.id);
      if (!sector) return;

      const validTables = sector.tables.filter(t => t.capacity >= sectorGuestCount && t.capacity <= sectorGuestCount + 2);
      const timeMap = new Map<string, string>(); 
      validTables.forEach(table => table.timeSlots.forEach(slot => {
        if (!slot.isOccupied && !timeMap.has(slot.startTime)) timeMap.set(slot.startTime, table.id); 
      }));

      const times = Array.from(timeMap.entries()).map(([time, tableId]) => ({ time, tableId })).sort((a, b) => a.time.localeCompare(b.time));
      setAvailableTimes(times);
    } catch (error) {
      setAlertConfig({ type: 'error', title: 'Erro', message: 'Falha ao buscar horários.' });
      setAlertVisible(true);
    } finally {
      setIsSearchingTimes(false);
    }
  };

  const handleLockSectorTime = async (time: string, tableId: string) => {
    try {
      setIsQuickReserving(true); 
      await apiClient.lockTable({ restaurantTableId: tableId, reservationDate: `${selectedDate}T${time}:00Z`, clientId: 'cliente-mobile-123' });
      setShowSectorReserve(false);
      setReservationResult({ restaurantTableId: tableId, formattedDate: selectedDate!.split('-').reverse().join('/'), time: time, sectorName: selectedSector!.name, tableCapacity: sectorGuestCount });
      setAlertConfig({ type: 'success', title: 'Horário Garantido!', message: `Lugar reservado às ${time}. Tem 5 minutos para confirmar.` });
      setAlertVisible(true);
    } catch (error: any) {
      setAlertConfig({ type: 'error', title: 'Ops!', message: error.message || 'Horário acabou de ser reservado.' });
      setAlertVisible(true);
    } finally {
      setIsQuickReserving(false);
    }
  };

  const handleAlertConfirm = () => {
    setAlertVisible(false);
    if (alertConfig.type === 'success' && reservationResult) {
      router.push({ pathname: `/checkout/${reservationResult.restaurantTableId}`, params: { date: reservationResult.formattedDate, time: reservationResult.time, sectorName: reservationResult.sectorName, capacity: reservationResult.tableCapacity } });
      setReservationResult(null); 
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (error) return <View style={styles.centered}><Text>{error}</Text></View>;
  const restaurant = restaurants[0];
  if (!restaurant) return <View style={styles.centered}><Text>Restaurante não encontrado.</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{restaurant.name}</Text>
          <Text style={styles.headerSubtitle}>Selecione o ambiente desejado</Text>
        </View>
        
        {restaurant.sectors.map((sector) => (
          <View key={sector.id} style={styles.sectorCard}>
            <View style={styles.sectorHeader}>
              <Text style={styles.sectorTitle}>{sector.name}</Text>
              {sector.hasMapLayout && <Text style={styles.badge}>🗺️ Mapa Interativo</Text>}
            </View>
            <Text style={styles.sectorDescription}>
              {sector.hasMapLayout ? 'Escolha a sua mesa diretamente no mapa do salão.' : 'Reserva inteligente de lugares disponíveis.'}
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setSelectedSector(sector);
                setSectorGuestCount(2);
                setSelectedDate(null);
                setAvailableTimes(null);
                
                if (sector.hasMapLayout) {
                  setAvailableDates(getNext7Days().map(formatDateVisual));
                } else {
                  setAvailableDates(null);
                }
                
                setShowSectorReserve(true);
              }}
            >
              <Text style={styles.actionButtonText}>
                {sector.hasMapLayout ? 'Procurar no Mapa' : 'Escolher Data e Hora'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.quickReserveFooterButton} onPress={() => setShowQuickReserve(true)}>
          <Text style={styles.quickReserveFooterText}>⚡ Reserva Rápida (Qualquer Ambiente)</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showQuickReserve} animationType="slide" transparent={true} onRequestClose={() => setShowQuickReserve(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowQuickReserve(false)}>
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Reserva Inteligente</Text>
            <Text style={styles.sheetSubtitle}>Informe apenas a quantidade de pessoas. Nós encontramos a melhor mesa e o melhor horário disponível.</Text>
            <Text style={styles.sectionTitle}>Para quantas pessoas?</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity style={styles.counterButton} onPress={() => setQuickGuestCount(Math.max(1, quickGuestCount - 1))}><Text style={styles.counterButtonText}>-</Text></TouchableOpacity>
              <Text style={styles.counterValue}>{quickGuestCount}</Text>
              <TouchableOpacity style={styles.counterButton} onPress={() => setQuickGuestCount(Math.min(20, quickGuestCount + 1))}><Text style={styles.counterButtonText}>+</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.confirmButton, isQuickReserving && styles.confirmButtonDisabled]} onPress={handleQuickReserve} disabled={isQuickReserving}>
              {isQuickReserving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmButtonText}>Encontrar Mesa Agora</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSectorReserve} animationType="slide" transparent={true} onRequestClose={() => setShowSectorReserve(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSectorReserve(false)}>
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{selectedSector?.name}</Text>
            
            {!availableTimes ? (
              <>
                {isMapSector ? (
                  <Text style={styles.sheetSubtitle}>Escolha o dia da reserva para abrir o mapa e selecionar a sua mesa.</Text>
                ) : (
                  <>
                    <Text style={styles.sheetSubtitle}>1. Informe quantas pessoas irão consigo.</Text>
                    <View style={styles.counterContainerLeft}>
                      <TouchableOpacity style={styles.counterButtonSmall} onPress={() => setSectorGuestCount(Math.max(1, sectorGuestCount - 1))}><Text style={styles.counterButtonText}>-</Text></TouchableOpacity>
                      <Text style={styles.counterValueSmall}>{sectorGuestCount}</Text>
                      <TouchableOpacity style={styles.counterButtonSmall} onPress={() => setSectorGuestCount(Math.min(20, sectorGuestCount + 1))}><Text style={styles.counterButtonText}>+</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.searchDatesBtn} onPress={handleSearchDates} disabled={isSearchingDates}>
                        {isSearchingDates ? <ActivityIndicator color="#FFF" /> : <Text style={styles.searchDatesBtnText}>Ver Datas</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {availableDates && (
                  <>
                    <Text style={styles.sheetSubtitle}>{isMapSector ? 'Selecione o dia para abrir a planta do salão.' : '2. Escolha uma data disponível'}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                      {availableDates.map(day => (
                        <TouchableOpacity key={day.iso} style={[styles.dateCard, selectedDate === day.iso && styles.dateCardActive]} onPress={() => handleSelectDate(day.iso)}>
                          {isSearchingTimes && selectedDate === day.iso ? <ActivityIndicator color="#FFF" /> : <><Text style={[styles.dateDayName, selectedDate === day.iso && styles.dateTextActive]}>{day.dayName}</Text><Text style={[styles.dateDayNum, selectedDate === day.iso && styles.dateTextActive]}>{day.dayNum}</Text></>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </>
            ) : (
              <>
                <View style={styles.resultHeader}>
                  <TouchableOpacity onPress={() => setAvailableTimes(null)}><Text style={styles.backLink}>← Voltar para Datas</Text></TouchableOpacity>
                  <Text style={styles.sectionTitleLeft}>Horários em {selectedDate?.split('-').reverse().join('/')}</Text>
                </View>
                <View style={styles.timeGrid}>
                  {availableTimes.map(slot => (
                    <TouchableOpacity key={slot.time} style={styles.timeButton} onPress={() => handleLockSectorTime(slot.time, slot.tableId)} disabled={isQuickReserving}>
                      <Text style={styles.timeButtonText}>{slot.time}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {isQuickReserving && <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomAlert visible={alertVisible} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} confirmText={alertConfig.type === 'success' ? 'Ir para Checkout' : 'OK'} onConfirm={handleAlertConfirm} />
    </View>
  );
};

// Mantenha exatamente os mesmos styles do último arquivo
const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { flex: 1 },
  header: { padding: 24, paddingTop: 40, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  sectorCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  sectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectorTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  badge: { backgroundColor: '#DBEAFE', color: '#1E40AF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, overflow: 'hidden' },
  sectorDescription: { color: '#4B5563', marginBottom: 16, fontSize: 14 },
  actionButton: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 10 },
  quickReserveFooterButton: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  quickReserveFooterText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  sheetSubtitle: { fontSize: 16, color: '#4B5563', marginBottom: 12, marginTop: 10, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16, textAlign: 'center' },
  sectionTitleLeft: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 10 },
  counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  counterContainerLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  counterButton: { width: 50, height: 50, backgroundColor: '#F3F4F6', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  counterButtonSmall: { width: 40, height: 40, backgroundColor: '#F3F4F6', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  counterButtonText: { fontSize: 24, color: '#374151', fontWeight: 'bold' },
  counterValue: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 30, color: '#111827' },
  counterValueSmall: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 16, color: '#111827' },
  searchDatesBtn: { marginLeft: 'auto', backgroundColor: '#111827', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  searchDatesBtnText: { color: '#FFF', fontWeight: 'bold' },
  confirmButton: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  confirmButtonDisabled: { backgroundColor: '#9CA3AF' },
  confirmButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  dateScroll: { flexDirection: 'row', marginBottom: 20, maxHeight: 90 },
  dateCard: { width: 70, height: 80, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  dateCardActive: { backgroundColor: '#2563EB', borderColor: '#1D4ED8' },
  dateDayName: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  dateDayNum: { fontSize: 22, color: '#111827', fontWeight: 'bold' },
  dateTextActive: { color: '#FFF' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backLink: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  timeButton: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#DBEAFE', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  timeButtonText: { color: '#1D4ED8', fontWeight: 'bold', fontSize: 16 },
});