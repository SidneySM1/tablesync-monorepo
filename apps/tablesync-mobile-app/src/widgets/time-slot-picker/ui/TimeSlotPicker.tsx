import { ReservationDay, Sector, Slot } from '@entities/sector/model/types';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TimeSlotPickerProps {
  sector: Sector;
  onSelectSlot: (day: ReservationDay, slot: Slot) => void;
}

export const TimeSlotPicker = ({ sector, onSelectSlot }: TimeSlotPickerProps) => {
  // Inicializa com o primeiro dia disponível
  const [selectedDay, setSelectedDay] = useState<ReservationDay>(sector.days[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleSelectDay = (day: ReservationDay) => {
    setSelectedDay(day);
    setSelectedTime(null); // Reseta o horário ao mudar o dia
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>1. Escolha a data:</Text>
      <FlatList
        horizontal
        data={sector.days}
        keyExtractor={(item) => item.date}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.dayCard, selectedDay.date === item.date && styles.selectedCard]}
            onPress={() => handleSelectDay(item)}
          >
            <Text style={[styles.dayName, selectedDay.date === item.date && styles.selectedText]}>
              {item.dayName}
            </Text>
            <Text style={[styles.dayLabel, selectedDay.date === item.date && styles.selectedText]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.label}>2. Escolha o horário:</Text>
      <View style={styles.slotsGrid}>
        {selectedDay.slots.map((slot) => {
          const isDisabled = !slot.available;
          return (
            <TouchableOpacity
              key={slot.time}
              disabled={isDisabled}
              style={[
                styles.slotChip,
                selectedTime === slot.time && styles.selectedSlot,
                isDisabled && styles.disabledSlot
              ]}
              onPress={() => {
                setSelectedTime(slot.time);
                onSelectSlot(selectedDay, slot);
              }}
            >
              <Text style={[styles.slotText, selectedTime === slot.time && styles.selectedText, isDisabled && styles.disabledText]}>
                {slot.time}
              </Text>
              {/* Se for Pista, mostra quantas vagas restam */}
              {sector.type === 'STANDING' && slot.remaining !== undefined && (
                 <Text style={styles.remainingText}>{slot.remaining} vagas</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 10 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10, textTransform: 'uppercase' },
  daysList: { paddingBottom: 15 },
  dayCard: { 
    width: 70, height: 70, backgroundColor: '#F0F0F0', borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#EEE' 
  },
  selectedCard: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  dayName: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  dayLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  selectedText: { color: '#FFF' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: { 
    paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFF', 
    borderRadius: 10, borderWidth: 1, borderColor: '#DDD', minWidth: '22%', alignItems: 'center' 
  },
  selectedSlot: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  disabledSlot: { backgroundColor: '#F8F8F8', borderColor: '#EEE' },
  slotText: { fontSize: 16, fontWeight: '600', color: '#333' },
  disabledText: { color: '#CCC' },
  remainingText: { fontSize: 10, color: '#666', marginTop: 2 }
});