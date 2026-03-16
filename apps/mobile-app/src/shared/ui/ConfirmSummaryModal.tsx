// src/shared/ui/ConfirmSummaryModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ConfirmSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  data: {
    sectorName: string;
    date: string;
    time: string;
    capacity: number;
    tableNumber?: number;
  } | null;
}

export const ConfirmSummaryModal = ({ visible, onClose, onConfirm, isSubmitting, data }: ConfirmSummaryModalProps) => {
  if (!data) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Revisar Reserva</Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Feather name="x" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.row}>
              <Feather name="map-pin" size={20} color="#2563EB" />
              <View style={styles.textGroup}>
                <Text style={styles.label}>Ambiente</Text>
                <Text style={styles.value}>{data.sectorName} {data.tableNumber ? `(Mesa ${data.tableNumber})` : ''}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Feather name="calendar" size={20} color="#2563EB" />
              <View style={styles.textGroup}>
                <Text style={styles.label}>Data e Hora</Text>
                <Text style={styles.value}>{data.date} às {data.time}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Feather name="users" size={20} color="#2563EB" />
              <View style={styles.textGroup}>
                <Text style={styles.label}>Lotação Máxima</Text>
                <Text style={styles.value}>Até {data.capacity} pessoas</Text>
              </View>
            </View>
          </View>

          <Text style={styles.warningText}>
            Ao confirmar, esta mesa ficará bloqueada exclusivamente para si durante 5 minutos para finalizar o registo.
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Sim, Checkout</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  summaryCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  textGroup: { marginLeft: 12 },
  label: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 16, color: '#111827', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12, marginLeft: 32 },
  warningText: { fontSize: 13, color: '#D97706', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, textAlign: 'center', marginBottom: 24 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelButtonText: { color: '#4B5563', fontWeight: 'bold', fontSize: 16 },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center' },
  confirmButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});