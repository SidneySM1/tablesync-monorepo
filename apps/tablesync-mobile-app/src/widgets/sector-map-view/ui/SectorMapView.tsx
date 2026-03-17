import { Slot, Table } from '@entities/sector';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SectorMapViewProps {
  slot: Slot;
  onSelectTable: (table: Table) => void;
  isLocking?: boolean;
}

export const SectorMapView = ({ slot, onSelectTable, isLocking }: SectorMapViewProps) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Ionicons name="map-outline" size={20} color="#666" />
        <Text style={styles.headerText}>Toque em uma mesa disponível (Verde)</Text>
      </View>

      {/* ScrollView duplo para mapas que extrapolam a largura da tela */}
      <ScrollView 
        horizontal 
        contentContainerStyle={styles.horizontalScroll}
        showsHorizontalScrollIndicator={true}
      >
        <ScrollView 
          contentContainerStyle={styles.verticalScroll}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.mapCanvas}>
            {slot.tables?.map((table) => {
              const isAvailable = !table.isOccupied;

              return (
                <TouchableOpacity
                  key={table.id}
                  disabled={!isAvailable || isLocking}
                  onPress={() => onSelectTable(table)}
                  style={[
                    styles.tableContainer,
                    { left: table.positionX, top: table.positionY }, // Coordenadas do C#
                    isAvailable ? styles.tableAvailable : styles.tableOccupied
                  ]}
                >
                  <Ionicons 
                    name="restaurant" 
                    size={14} 
                    color={isAvailable ? "#FFF" : "#999"} 
                  />
                  <Text style={[styles.tableNumber, !isAvailable && styles.textOccupied]}>
                    {table.tableNumber}
                  </Text>
                  
                  {!isAvailable && (
                    <View style={styles.occupiedBadge}>
                      <Ionicons name="close-circle" size={10} color="#FF3B30" />
                    </View>
                  )}
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
  wrapper: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#DDD' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', gap: 8 },
  headerText: { fontSize: 13, color: '#666', fontWeight: '500' },
  horizontalScroll: { minWidth: '100%' },
  verticalScroll: { minHeight: 400 },
  mapCanvas: {
    width: 800, // Ajuste conforme a escala das suas coordenadas no DB
    height: 600,
    backgroundColor: '#FFF',
    position: 'relative',
  },
  tableContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  tableAvailable: { backgroundColor: '#34C759', borderWidth: 2, borderColor: '#28A745' },
  tableOccupied: { backgroundColor: '#E9ECEF', borderWidth: 1, borderColor: '#DEE2E6' },
  tableNumber: { fontSize: 11, fontWeight: '800', color: '#FFF', marginTop: 2 },
  textOccupied: { color: '#ADB5BD' },
  occupiedBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FFF', borderRadius: 10 }
});