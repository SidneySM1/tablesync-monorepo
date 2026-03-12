import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Restaurant } from '../entities/restaurant/types';
import { apiClient } from '../shared/api/api';
import { router } from 'expo-router';

export const HomeScreen = () => {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            // Aqui podemos passar a data de hoje, ou deixar vazio para o backend assumir o dia atual
            const data = await apiClient.getRestaurants();
            setRestaurants(data);
        } catch (err) {
            setError('Erro ao carregar os dados. Verifique a ligação à API.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>A sincronizar o salão...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }
    
    const restaurant = restaurants[0];

    if (!restaurant) {
        return (
            <View style={styles.centered}>
                <Text>Nenhum restaurante encontrado.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{restaurant.name}</Text>
                <Text style={styles.headerSubtitle}>Selecione o ambiente desejado</Text>
            </View>

            {restaurant.sectors.map((sector) => (
                <View key={sector.id} style={styles.sectorCard}>
                    <View style={styles.sectorHeader}>
                        <Text style={styles.sectorTitle}>{sector.name}</Text>
                        {sector.hasMapLayout && <Text style={styles.badge}>🗺️ Mapa Interativo</Text>}
                    </View>

                    <Text style={styles.sectorDescription}>
                        {sector.hasMapLayout
                            ? 'Escolha a sua mesa diretamente no mapa do salão.'
                            : 'Procura automática de lugares disponíveis.'}
                    </Text>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            if (sector.hasMapLayout) {
                                // Navega para a futura tela do mapa passando o ID do setor
                                router.push(`/map/${sector.id}`);
                            } else {
                                console.log('Procurar vagas automáticas');
                            }
                        }}
                    >
                        <Text style={styles.actionButtonText}>
                            {sector.hasMapLayout ? 'Abrir Mapa' : 'Procurar Vagas'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
    loadingText: { marginTop: 12, color: '#4B5563', fontSize: 16 },
    errorText: { color: '#DC2626', marginBottom: 16, textAlign: 'center', paddingHorizontal: 20 },
    retryButton: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryButtonText: { color: '#FFF', fontWeight: 'bold' },

    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { padding: 24, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 16 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    headerSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },

    sectorCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    sectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectorTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
    badge: { backgroundColor: '#DBEAFE', color: '#1E40AF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, overflow: 'hidden' },
    sectorDescription: { color: '#4B5563', marginBottom: 16, fontSize: 14 },

    actionButton: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});