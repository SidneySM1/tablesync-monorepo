// src/shared/ui/CustomAlert.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type AlertType = 'success' | 'error' | 'warning';

interface CustomAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
}

export const CustomAlert = ({ visible, type, title, message, confirmText = 'OK', onConfirm }: CustomAlertProps) => {
  
  // Configuração visual dinâmica baseada no tipo de alerta
  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'check-circle', color: '#10B981', bg: '#D1FAE5' }; // Verde
      case 'error':
        return { icon: 'x-circle', color: '#EF4444', bg: '#FEE2E2' };     // Vermelho
      case 'warning':
        return { icon: 'alert-triangle', color: '#F59E0B', bg: '#FEF3C7' }; // Laranja
      default:
        return { icon: 'info', color: '#3B82F6', bg: '#DBEAFE' };         // Azul
    }
  };

  const config = getAlertConfig();

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onConfirm}>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          
          {/* ÍCONE GIGANTE NO TOPO */}
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            <Feather name={config.icon as any} size={40} color={config.color} />
          </View>

          {/* TEXTOS */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* BOTÃO */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: config.color }]} 
            onPress={onConfirm}
          >
            <Text style={styles.buttonText}>{confirmText}</Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: '#FFF',
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});