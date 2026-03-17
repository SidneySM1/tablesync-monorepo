import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'bottom' | 'center';
  title?: string;
  children: React.ReactNode;
}

export const AppModal = ({ visible, onClose, type, title, children }: AppModalProps) => {
  const isBottom = type === 'bottom';

  return (
    <Modal visible={visible} transparent animationType={isBottom ? "slide" : "fade"} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, isBottom ? styles.alignBottom : styles.alignCenter]}>
          <TouchableWithoutFeedback>
            <View style={[styles.content, isBottom ? styles.bottomSheet : styles.centerDialog]}>
              {title && <Text style={styles.title}>{title}</Text>}
              {children}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text>Fechar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  alignCenter: { justifyContent: 'center', alignItems: 'center' },
  alignBottom: { justifyContent: 'flex-end' },
  content: { backgroundColor: '#FFF', padding: 20 },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', minHeight: '30%' },
  centerDialog: { borderRadius: 20, width: '85%', shadowOpacity: 0.25, elevation: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  closeBtn: { marginTop: 20, alignItems: 'center' }
});