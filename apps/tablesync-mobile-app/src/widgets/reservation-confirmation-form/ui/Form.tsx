import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  lockData: any; // activeLock vindo do hook
  onConfirm: (data: { name: string; phone: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ReservationConfirmationForm = ({ lockData, onConfirm, onCancel, loading }: Props) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos de lock no Redis

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.timerBadge}>
        <Ionicons name="timer-outline" size={14} color="#FF3B30" />
        <Text style={styles.timerText}>Expira em {formatTime(timeLeft)}</Text>
      </View>

      <Text style={styles.title}>Quase lá!</Text>
      <Text style={styles.subtitle}>Preencha seus dados para garantir a reserva em Fortaleza.</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Nome Completo" 
        value={name} 
        onChangeText={setName} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="WhatsApp (ex: 85999999999)" 
        keyboardType="phone-pad"
        value={phone} 
        onChangeText={setPhone} 
      />

      <TouchableOpacity 
        style={[styles.btn, (!name || !phone) && styles.btnOff]} 
        disabled={!name || !phone || loading}
        onPress={() => onConfirm({ name, phone })}
      >
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Confirmar e Reservar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={onCancel} style={styles.cancelLink}>
        <Text style={styles.cancelText}>Desistir e liberar vaga</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 20, backgroundColor: '#FFF', borderRadius: 20 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#FFF1F0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 15, gap: 5 },
  timerText: { color: '#FF3B30', fontSize: 12, fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25, marginTop: 5 },
  input: { backgroundColor: '#F5F7FA', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  btn: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnOff: { backgroundColor: '#CCC' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cancelLink: { marginTop: 20, alignItems: 'center' },
  cancelText: { color: '#999', fontSize: 14, textDecorationLine: 'underline' }
});