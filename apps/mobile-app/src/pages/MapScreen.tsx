import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiClient } from '../shared/api/api';
import { Sector, Table, TimeSlot } from '../entities/restaurant/types';
import { CustomAlert, AlertType } from '../shared/ui/CustomAlert';

export const MapScreen = () => {
	const { id } = useLocalSearchParams();

	const [sector, setSector] = useState<Sector | null>(null);
	const [loading, setLoading] = useState(true);

	// Novos estados para o Modal e o processo de Lock
	const [selectedTable, setSelectedTable] = useState<Table | null>(null);
	const [isLocking, setIsLocking] = useState(false);

	const [alertVisible, setAlertVisible] = useState(false);
	const [alertConfig, setAlertConfig] = useState({ type: 'success' as AlertType, title: '', message: '' });

	useEffect(() => {
		loadSectorData();
	}, [id]);

	const loadSectorData = async () => {
		try {
			const restaurants = await apiClient.getRestaurants();
			const currentSector = restaurants[0].sectors.find(s => s.id === id);
			setSector(currentSector || null);
		} catch (error) {
			console.error("Erro ao carregar mapa:", error);
		} finally {
			setLoading(false);
		}
	};

	// Função que chama a nossa API de Lock
	const handleLockTime = async (timeSlot: TimeSlot) => {
    if (!selectedTable) return;

    try {
      setIsLocking(true);
      const today = new Date().toISOString().split('T')[0];
      const exactDateTime = `${today}T${timeSlot.startTime}:00Z`;

      await apiClient.lockTable({
        restaurantTableId: selectedTable.id,
        reservationDate: exactDateTime,
        clientId: 'cliente-mobile-123'
      });

      setSelectedTable(null); // Fecha a gaveta
      setAlertConfig({
        type: 'success',
        title: 'Sucesso!',
        message: 'Mesa reservada temporariamente. Tem 5 minutos para confirmar os seus dados.'
      });
      setAlertVisible(true);
      loadSectorData(); 
      
    } catch (error: any) {
      setAlertConfig({
        type: 'error',
        title: 'Ops!',
        message: error.message || 'Este horário acabou de ser reservado por outra pessoa.'
      });
      setAlertVisible(true);
    } finally {
      setIsLocking(false);
    }
  };

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#2563EB" />
				<Text style={{ marginTop: 10 }}>A desenhar a planta do salão...</Text>
			</View>
		);
	}

	if (!sector) return <View style={styles.centered}><Text>Setor não encontrado.</Text></View>;

	return (
		<View style={styles.container}>
			{/* Cabeçalho */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Text style={styles.backButtonText}>← Voltar</Text>
				</TouchableOpacity>
				<Text style={styles.title}>{sector.name}</Text>
				<Text style={styles.subtitle}>Selecione uma mesa no mapa</Text>
			</View>

			{/* O CHÃO DO RESTAURANTE */}
			<View style={styles.mapArea}>
				<View style={styles.floorPlan}>
					{sector.tables.map(table => {
						// Se TODOS os horários estiverem ocupados, a mesa inteira fica indisponível
						const isFullyOccupied = table.timeSlots.every(ts => ts.isOccupied);

						return (
							<TouchableOpacity
								key={table.id}
								style={[
									styles.table,
									{ left: `${table.positionX}%`, top: `${table.positionY}%` }
								]}
								onPress={() => !isFullyOccupied && setSelectedTable(table)}
								disabled={isFullyOccupied}
							>
								<View style={[styles.tableShape, isFullyOccupied && styles.tableOccupied]}>
									<Text style={styles.tableNumber}>{table.tableNumber}</Text>
								</View>
							</TouchableOpacity>
						)
					})}
				</View>
			</View>

			{/* MODAL BOTTOM SHEET (GAVETA DE HORÁRIOS) */}
			<Modal
				visible={!!selectedTable}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setSelectedTable(null)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setSelectedTable(null)}
				>
					<View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
						<View style={styles.sheetHandle} />

						{selectedTable && (
							<>
								<Text style={styles.sheetTitle}>Mesa {selectedTable.tableNumber}</Text>
								<Text style={styles.sheetSubtitle}>Capacidade para {selectedTable.capacity} pessoas</Text>

								<Text style={styles.sectionTitle}>Horários Disponíveis Hoje</Text>

								<View style={styles.timeGrid}>
									{selectedTable.timeSlots.map(slot => (
										<TouchableOpacity
											key={slot.id}
											style={[styles.timeButton, slot.isOccupied && styles.timeButtonDisabled]}
											disabled={slot.isOccupied || isLocking}
											onPress={() => handleLockTime(slot)}
										>
											<Text style={[styles.timeButtonText, slot.isOccupied && styles.timeTextDisabled]}>
												{slot.startTime}
											</Text>
										</TouchableOpacity>
									))}
								</View>

								{isLocking && <ActivityIndicator style={{ marginTop: 20 }} color="#2563EB" />}
							</>
						)}
					</View>
				</TouchableOpacity>
			</Modal>
			<CustomAlert 
				visible={alertVisible}
				type={alertConfig.type}
				title={alertConfig.title}
				message={alertConfig.message}
				onConfirm={() => setAlertVisible(false)}
			/>
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

	mapArea: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
	floorPlan: {
		width: '100%', aspectRatio: 1, backgroundColor: '#E5E7EB', borderRadius: 12,
		borderWidth: 2, borderColor: '#D1D5DB', position: 'relative', overflow: 'hidden',
	},

	table: { position: 'absolute', marginLeft: -25, marginTop: -25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
	tableShape: {
		width: 44, height: 44, backgroundColor: '#10B981', borderRadius: 22,
		justifyContent: 'center', alignItems: 'center',
		shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 4,
		borderWidth: 2, borderColor: '#059669',
	},
	tableOccupied: { backgroundColor: '#9CA3AF', borderColor: '#6B7280' },
	tableNumber: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

	// Estilos do Modal (Bottom Sheet)
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	bottomSheet: {
		backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
		padding: 24, paddingBottom: 40, minHeight: 300,
		shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10
	},
	sheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
	sheetTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
	sheetSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
	sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },

	timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
	timeButton: {
		paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#DBEAFE',
		borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE'
	},
	timeButtonDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
	timeButtonText: { color: '#1D4ED8', fontWeight: 'bold', fontSize: 16 },
	timeTextDisabled: { color: '#9CA3AF' }
});