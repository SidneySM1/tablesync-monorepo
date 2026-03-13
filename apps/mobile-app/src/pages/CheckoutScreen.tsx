// src/pages/CheckoutScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CustomAlert, AlertType } from '../shared/ui/CustomAlert';
// Nota: Vamos adicionar a chamada da API real no próximo passo!

export const CheckoutScreen = () => {
  // Recebemos os dados da mesa e do horário via URL
  const { tableId, date, time, sectorName, capacity } = useLocalSearchParams();

  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ type: 'success' as AlertType, title: '', message: '' });

  const handleConfirm = async () => {
    if (!form.name || !form.email || !form.phone) {
      setAlertConfig({ type: 'warning', title: 'Atenção', message: 'Por favor, preencha todos os campos.' });
      setAlertVisible(true);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Aqui entrará a chamada para a nossa API Gateway (Publicar no RabbitMQ)
      // await apiClient.confirmReservation({...})
      
      // Simulando o tempo da API por enquanto
      await new Promise(resolve => setTimeout(resolve, 1500));

      setAlertConfig({
        type: 'success',
        title: 'Reserva Confirmada! 🥂',
        message: `A sua mesa em ${sectorName} está garantida para as ${time}.\n\nEnviámos um email com os detalhes para ${form.email}.`
      });
      setAlertVisible(true);

    } catch (error) {
      setAlertConfig({ type: 'error', title: 'Erro', message: 'Falha ao confirmar a reserva. Tente novamente.' });
      setAlertVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAlertConfirm = () => {
    setAlertVisible(false);
    if (alertConfig.type === 'success') {
      router.dismissAll(); // Limpa o histórico
      router.replace('/'); // Volta para a Home
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finalizar Reserva</Text>
        </View>

        {/* RESUMO DO PEDIDO */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumo da sua Mesa</Text>
          <View style={styles.summaryRow}>
            <Feather name="map-pin" size={18} color="#4B5563" />
            <Text style={styles.summaryText}>{sectorName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Feather name="clock" size={18} color="#4B5563" />
            <Text style={styles.summaryText}>{date} às {time}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Feather name="users" size={18} color="#4B5563" />
            <Text style={styles.summaryText}>Até {capacity} pessoas</Text>
          </View>
          
          <View style={styles.timerBox}>
            <Feather name="alert-circle" size={16} color="#B45309" />
            <Text style={styles.timerText}>A sua mesa está bloqueada por 5:00 minutos.</Text>
          </View>
        </View>

        {/* FORMULÁRIO */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: João Silva"
            value={form.name}
            onChangeText={(t) => setForm({...form, name: t})}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: joao@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(t) => setForm({...form, email: t})}
          />

          <Text style={styles.label}>Telefone (WhatsApp)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: 912 345 678"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(t) => setForm({...form, phone: t})}
          />
        </View>

      </ScrollView>

      {/* BOTÃO FIXO NO RODAPÉ */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]} 
          onPress={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmButtonText}>Confirmar Reserva</Text>}
        </TouchableOpacity>
      </View>

      <CustomAlert 
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={handleAlertConfirm}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { paddingBottom: 100 },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  
  summaryCard: { backgroundColor: '#FFF', margin: 16, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryText: { fontSize: 16, color: '#4B5563', marginLeft: 8 },
  timerBox: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  timerText: { color: '#B45309', marginLeft: 8, fontSize: 14, fontWeight: '500' },
  
  formContainer: { marginHorizontal: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 16, color: '#111827' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  confirmButton: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  confirmButtonDisabled: { backgroundColor: '#9CA3AF' },
  confirmButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
});