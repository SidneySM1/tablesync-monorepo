// src/pages/MapScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiClient } from '../shared/api/api';
import { Sector, Table, Restaurant } from '../entities/restaurant/types';
import { CustomAlert, AlertType } from '../shared/ui/CustomAlert';
import { ConfirmSummaryModal } from '../shared/ui/ConfirmSummaryModal';

export const MapScreen = () => {
	const { id, date } = useLocalSearchParams();

	const [sector, setSector] = useState<Sector | null>(null);
	const [loading, setLoading] = useState(true);

	const [selectedTable, setSelectedTable] = useState<Table | null>(null);
	const [selectedTime, setSelectedTime] = useState<string | null>(null);
	const [showTimeModal, setShowTimeModal] = useState(false);

	const [showSummary, setShowSummary] = useState(false);
	const [isLocking, setIsLocking] = useState(false);

	const [alertVisible, setAlertVisible] = useState(false);
	const [alertConfig, setAlertConfig] = useState({ type: 'success' as AlertType, title: '', message: '' });

	useEffect(() => {
		loadSectorData();
	}, [id, date]);

	const loadSectorData = async () => {
		try {
			setLoading(true);
			const restaurants: Restaurant[] = await apiClient.getRestaurants(date as string);
			const restaurant = restaurants[0];
			const currentSector = restaurant?.sectors.find(s => s.id === id);
			setSector(currentSector || null);
		} catch (error) {
			console.error("Erro ao carregar mapa:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSelectTable = (table: Table) => {
		setSelectedTable(table);
		setSelectedTime(null);
		setShowSummary(false);
		setShowTimeModal(true);
	};

	const handleConfirmTime = async () => {
		if (!selectedTable || !selectedTime) return;
		try {
			setIsLocking(true);
			const exactDateTime = `${date}T${selectedTime}:00Z`;
			await apiClient.lockTable({
				restaurantTableId: selectedTable.id,
				reservationDate: exactDateTime,
				clientId: 'cliente-mobile-123'
			});
			setShowTimeModal(false);
		} catch (error: any) {
			setShowTimeModal(false);
			setSelectedTable(null);
			setSelectedTime(null);
			await loadSectorData(); // recarrega para reflectir o lock do concorrente
			setAlertConfig({
				type: 'error',
				title: 'Horário Indisponível',
				message: error.message || 'Este horário acabou de ser reservado por outra pessoa.'
			});
			setAlertVisible(true);
		} finally {
			setIsLocking(false);
		}
	};

	const handleConfirmReservation = async () => {
		if (!selectedTable || !selectedTime) return;

		try {
			setIsLocking(true);
			const exactDateTime = `${date}T${selectedTime}:00Z`;

			// Re-lock idempotente: renova o TTL se já tivermos o bloqueio
			await apiClient.lockTable({
				restaurantTableId: selectedTable.id,
				reservationDate: exactDateTime,
				clientId: 'cliente-mobile-123'
			});

			setShowSummary(false);
			router.push({
				pathname: `/checkout/${selectedTable.id}`,
				params: {
					date: formattedDate,
					time: selectedTime,
					sectorName: sector?.name,
					capacity: selectedTable.capacity
				}
			});
		} catch (error: any) {
			setShowSummary(false);
			setSelectedTable(null);
			setSelectedTime(null);
			await loadSectorData();
			setAlertConfig({
				type: 'error',
				title: 'Reserva Expirada',
				message: error.message || 'O bloqueio expirou. Selecione o horário novamente.'
			});
			setAlertVisible(true);
		} finally {
			setIsLocking(false);
		}
	};

	const handleAlertConfirm = () => {
		setAlertVisible(false);
	};

	if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>;
	if (!sector) return <View style={styles.centered}><Text>Setor não encontrado.</Text></View>;

	const formattedDate = (date as string).split('-').reverse().join('/');
	const selectedSlot = selectedTable?.timeSlots.find(slot => slot.startTime === selectedTime) ?? null;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>← Voltar</Text></TouchableOpacity>
				<Text style={styles.title}>{sector.name}</Text>
				<Text style={styles.subtitle}>{formattedDate} — toque numa mesa para escolher o horário</Text>
				<View style={styles.legendRow}>
					<View style={styles.legendItem}><View style={[styles.legendDot, styles.legendAvailable]} /><Text style={styles.legendText}>Disponível</Text></View>
					<View style={styles.legendItem}><View style={[styles.legendDot, styles.legendSelected]} /><Text style={styles.legendText}>Selecionada</Text></View>
					<View style={styles.legendItem}><View style={[styles.legendDot, styles.legendOccupied]} /><Text style={styles.legendText}>Indisponível</Text></View>
				</View>
			</View>

			<View style={styles.mapArea}>
				<View style={styles.floorPlan}>
					{sector.tables.map(table => {
						const isFullyBooked = table.timeSlots.every(ts => ts.isOccupied);
						const isSelected = selectedTable?.id === table.id;

						return (
							<TouchableOpacity
								key={table.id}
								style={[styles.table, { left: `${table.positionX}%`, top: `${table.positionY}%` }]}
								onPress={() => !isFullyBooked && handleSelectTable(table)}
								disabled={isFullyBooked}
							>
								<View style={[styles.tableShape, isFullyBooked && styles.tableOccupied, isSelected && styles.tableSelected]}>
									<Text style={styles.tableNumber}>{table.tableNumber}</Text>
								</View>
							</TouchableOpacity>
						)
					})}
				</View>

			</View>

			<Modal visible={showTimeModal} animationType="slide" transparent={true} onRequestClose={() => setShowTimeModal(false)}>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTimeModal(false)}>
					<View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
						<View style={styles.sheetHandle} />
						{selectedTable && (
							<>
								<View style={styles.selectionHeader}>
									<View>
										<Text style={styles.sheetTitle}>Mesa {selectedTable.tableNumber}</Text>
										<Text style={styles.sheetSubtitle}>Capacidade para {selectedTable.capacity} pessoas</Text>
									</View>
									<TouchableOpacity onPress={() => setShowTimeModal(false)}>
										<Text style={styles.clearSelectionText}>Fechar</Text>
									</TouchableOpacity>
								</View>
								<Text style={styles.sectionTitle}>Selecione um horário disponível:</Text>
								<View style={styles.timeGrid}>
									{selectedTable.timeSlots.map(slot => {
										const isSlotSelected = selectedTime === slot.startTime;
										return (
											<TouchableOpacity
												key={slot.id}
												style={[styles.timeButton, slot.isOccupied && styles.timeButtonDisabled, isSlotSelected && styles.timeButtonActive]}
												disabled={slot.isOccupied}
												onPress={() => setSelectedTime(slot.startTime)}
											>
												<Text style={[styles.timeButtonText, slot.isOccupied && styles.timeTextDisabled, isSlotSelected && styles.timeTextActive]}>
													{slot.startTime}
												</Text>
											</TouchableOpacity>
										);
									})}
								</View>
								<View style={styles.sheetFooter}>
									<TouchableOpacity
										style={[styles.selectTimeButton, (!selectedTime || isLocking) && styles.selectTimeButtonDisabled]}
										disabled={!selectedTime || isLocking}
										onPress={handleConfirmTime}
									>
										{isLocking
											? <ActivityIndicator color="#FFF" />
											: <Text style={styles.selectTimeButtonText}>
												{selectedTime ? `Confirmar ${selectedTime}` : 'Escolha um horário'}
											</Text>
										}
									</TouchableOpacity>
								</View>
							</>
						)}
					</View>
				</TouchableOpacity>
			</Modal>

			<View style={styles.footerBar}>
				<View>
					<Text style={styles.footerTitle}>
						{selectedTable ? `Mesa ${selectedTable.tableNumber}` : 'Nenhuma mesa selecionada'}
					</Text>
					<Text style={styles.footerSubtitle}>
						{selectedSlot ? `${formattedDate} às ${selectedSlot.startTime}` : 'Selecione uma mesa e um horário para continuar'}
					</Text>
				</View>
				<TouchableOpacity
					style={[styles.continueButton, (!selectedTable || !selectedTime) && styles.continueButtonDisabled]}
					disabled={!selectedTable || !selectedTime}
					onPress={() => setShowSummary(true)}
				>
					<Text style={styles.continueButtonText}>Confirmar Mesa</Text>
				</TouchableOpacity>
			</View>

			<ConfirmSummaryModal
				visible={showSummary}
				isSubmitting={isLocking}
				onClose={() => setShowSummary(false)}
				onConfirm={handleConfirmReservation}
				data={selectedTable && selectedTime ? {
					sectorName: sector.name,
					date: formattedDate,
					time: selectedTime,
					capacity: selectedTable.capacity,
					tableNumber: selectedTable.tableNumber
				} : null}
			/>

			<CustomAlert visible={alertVisible} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onConfirm={handleAlertConfirm} />
		</View>
	);
};

const styles = StyleSheet.create({
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
	container: { flex: 1, backgroundColor: '#F3F4F6' },
	header: { padding: 20, paddingTop: 40, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
	backButton: { marginBottom: 10 },
	backButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
	title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
	subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },

	mapArea: { flex: 1, padding: 20, paddingBottom: 10, justifyContent: 'center', alignItems: 'center' },
	floorPlan: { width: '100%', aspectRatio: 1, backgroundColor: '#E5E7EB', borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', position: 'relative', overflow: 'hidden' },
	table: { position: 'absolute', marginLeft: -25, marginTop: -25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
	tableShape: { width: 44, height: 44, backgroundColor: '#10B981', borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 4, borderWidth: 2, borderColor: '#059669' },
	tableSelected: { backgroundColor: '#2563EB', borderColor: '#1D4ED8', transform: [{ scale: 1.06 }] },
	tableOccupied: { backgroundColor: '#9CA3AF', borderColor: '#6B7280' },
	tableNumber: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

	legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	legendDot: { width: 12, height: 12, borderRadius: 6 },
	legendAvailable: { backgroundColor: '#10B981' },
	legendSelected: { backgroundColor: '#2563EB' },
	legendOccupied: { backgroundColor: '#9CA3AF' },
	legendText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	bottomSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
	sheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
	selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
	sheetFooter: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
	selectTimeButton: { backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
	selectTimeButtonDisabled: { backgroundColor: '#E5E7EB' },
	selectTimeButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
	sheetTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
	sheetSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
	clearSelectionText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
	sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },

	timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
	timeButton: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' },
	timeButtonActive: { backgroundColor: '#DBEAFE', borderColor: '#2563EB', borderWidth: 2 },
	timeButtonDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },

	timeButtonText: { color: '#374151', fontWeight: '600', fontSize: 16 },
	timeTextActive: { color: '#1D4ED8', fontWeight: 'bold' },
	timeTextDisabled: { color: '#9CA3AF' },

	footerBar: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10 },
	footerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
	footerSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
	continueButton: { backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
	continueButtonDisabled: { backgroundColor: '#E5E7EB' },
	continueButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});