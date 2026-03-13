// src/pages/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import { Restaurant } from '../entities/restaurant/types';
import { apiClient } from '../shared/api/api';
import { CustomAlert, AlertType } from '../shared/ui/CustomAlert';

export const HomeScreen = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para a Reserva Rápida
  const [showQuickReserve, setShowQuickReserve] = useState(false);
  const [guestCount, setGuestCount] = useState(2);
  const [isQuickReserving, setIsQuickReserving] = useState(false);
  
  // Estado para guardar os dados da mesa encontrada e enviar para o Checkout
  const [reservationResult, setReservationResult] = useState<any>(null);

  // Estados do Custom Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ type: 'success' as AlertType, title: '', message: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getRestaurants();
      setRestaurants(data);
    } catch (err) {
      setError('Erro ao carregar os dados. Verifique a ligação à API.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReserve = async () => {
    try {
      setIsQuickReserving(true);
      const result = await apiClient.quickReserve({ 
        guestCount, 
        clientId: 'cliente-mobile-123' 
      });

      // Guardamos o resultado para usar quando o utilizador fechar o alerta
      setReservationResult(result);
      setShowQuickReserve(false); // Fecha a gaveta
      
      setAlertConfig({
        type: 'success',
        title: 'Mesa Encontrada! 🎉',
        message: `Ambiente: ${result.sectorName}\nData: ${result.formattedDate}\nHorário: ${result.time}\n\nBloqueámos temporariamente esta mesa (até ${result.tableCapacity} pessoas) para si.`
      });
      setAlertVisible(true);
      
    } catch (error: any) {
      setAlertConfig({
        type: 'error',
        title: 'Lotação Máxima',
        message: error.message || 'Não encontramos mesas disponíveis para este perfil.'
      });
      setAlertVisible(true);
    } finally {
      setIsQuickReserving(false);
    }
  };

  // Função que lida com o clique no botão do CustomAlert
  const handleAlertConfirm = () => {
    setAlertVisible(false);
    
    // Se foi sucesso e temos os dados da reserva, navegamos para o Checkout
    if (alertConfig.type === 'success' && reservationResult) {
      router.push({
        pathname: `/checkout/${reservationResult.restaurantTableId}`,
        params: {
          date: reservationResult.formattedDate,
          time: reservationResult.time,
          sectorName: reservationResult.sectorName,
          capacity: reservationResult.tableCapacity
        }
      });
      
      // Limpamos o estado para a próxima vez
      setReservationResult(null); 
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>A sincronizar o salão...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const restaurant = restaurants[0];
  if (!restaurant) return <View style={styles.centered}><Text>Nenhum restaurante encontrado.</Text></View>;

  return (
    <View style={styles.container}>
      {/* CONTEÚDO SCROLLÁVEL */}
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
              {sector.hasMapLayout 
                ? 'Escolha a sua mesa diretamente no mapa do salão.' 
                : 'Procura automática de lugares disponíveis.'}
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                if (sector.hasMapLayout) {
                  router.push(`/map/${sector.id}`);
                } else {
                  setShowQuickReserve(true);
                }
              }}
            >
              <Text style={styles.actionButtonText}>
                {sector.hasMapLayout ? 'Abrir Mapa' : 'Procurar Vagas'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* RODAPÉ FIXO (FOOTER) */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.quickReserveFooterButton} 
          onPress={() => setShowQuickReserve(true)}
        >
          <Text style={styles.quickReserveFooterText}>⚡ Reserva Rápida (Qualquer Ambiente)</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL BOTTOM SHEET: RESERVA RÁPIDA */}
      <Modal
        visible={showQuickReserve}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickReserve(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowQuickReserve(false)}
        >
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            
            <Text style={styles.sheetTitle}>Reserva Inteligente</Text>
            <Text style={styles.sheetSubtitle}>O nosso Maître encontrará a melhor mesa disponível para si.</Text>
            
            <Text style={styles.sectionTitle}>Para quantas pessoas?</Text>
            
            {/* CONTADOR DE PESSOAS */}
            <View style={styles.counterContainer}>
              <TouchableOpacity 
                style={styles.counterButton} 
                onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>
              
              <Text style={styles.counterValue}>{guestCount}</Text>
              
              <TouchableOpacity 
                style={styles.counterButton} 
                onPress={() => setGuestCount(Math.min(20, guestCount + 1))}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* BOTÃO DE CONFIRMAÇÃO */}
            <TouchableOpacity 
              style={[styles.confirmButton, isQuickReserving && styles.confirmButtonDisabled]}
              onPress={handleQuickReserve}
              disabled={isQuickReserving}
            >
              {isQuickReserving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Encontrar Mesa Agora</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ALERTA CUSTOMIZADO */}
      <CustomAlert 
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.type === 'success' ? 'Ir para Checkout' : 'Tentar Novamente'}
        onConfirm={handleAlertConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, color: '#4B5563', fontSize: 16 },
  errorText: { color: '#DC2626', marginBottom: 16, textAlign: 'center', paddingHorizontal: 20 },
  retryButton: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontWeight: 'bold' },
  
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
  bottomSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  sheetSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16, textAlign: 'center' },
  
  counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  counterButton: { width: 50, height: 50, backgroundColor: '#F3F4F6', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  counterButtonText: { fontSize: 24, color: '#374151', fontWeight: 'bold' },
  counterValue: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 30, color: '#111827' },

  confirmButton: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  confirmButtonDisabled: { backgroundColor: '#9CA3AF' },
  confirmButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
});