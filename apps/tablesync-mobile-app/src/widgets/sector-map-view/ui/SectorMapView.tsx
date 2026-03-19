import { Slot, Table } from '@entities/sector';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  slot: Slot;
  selectedTableId: string | null;
  onSelectTable: (table: Table) => void;
}

export const SectorMapView = ({ slot, selectedTableId, onSelectTable }: Props) => {
  return (
    <View style={styles.container}>
      {/* Legenda Estilizada do App Antigo */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.bgAvailable]} /><Text style={styles.legendText}>Disponível</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.bgSelected]} /><Text style={styles.legendText}>Sua Escolha</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.bgOccupied]} /><Text style={styles.legendText}>Ocupada</Text></View>
      </View>

      <ScrollView horizontal contentContainerStyle={styles.centerMap}>
        <ScrollView contentContainerStyle={styles.centerMap}>
          <View style={styles.floorPlan}>
            {(slot.tables ?? []).map((table) => {
              const isSelected = selectedTableId === table.id;
              const isOccupied = table.isOccupied;

              return (
                <TouchableOpacity
                  key={table.id}
                  style={[styles.tableAnchor, { left: table.positionX, top: table.positionY }]}
                  disabled={isOccupied}
                  onPress={() => onSelectTable(table)}
                >
                  <View style={[
                    styles.tableShape,
                    isOccupied && styles.tableOccupied,
                    isSelected && styles.tableSelected
                  ]}>
                    <Text style={styles.tableNumber}>{table.tableNumber}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  bgAvailable: { backgroundColor: '#10B981' },
  bgSelected: { backgroundColor: '#2563EB' },
  bgOccupied: { backgroundColor: '#9CA3AF' },
  legendText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  
  centerMap: { minWidth: '100%', justifyContent: 'center', alignItems: 'center' },
  floorPlan: { width: 350, height: 450, backgroundColor: '#E5E7EB', borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', position: 'relative' },
  
  tableAnchor: { position: 'absolute', marginLeft: -22, marginTop: -22, width: 44, height: 44 },
  tableShape: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B981', 
    justifyContent: 'center', alignItems: 'center', elevation: 4, 
    borderWidth: 2, borderColor: '#059669',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2
  },
  tableSelected: { backgroundColor: '#2563EB', borderColor: '#1D4ED8', transform: [{ scale: 1.1 }] },
  tableOccupied: { backgroundColor: '#9CA3AF', borderColor: '#6B7280' },
  tableNumber: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});