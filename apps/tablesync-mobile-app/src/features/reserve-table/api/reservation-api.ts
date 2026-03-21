import { api } from '@shared/api/api-client';
import { LockRequest, LockResponse } from '../model/types';

export const lockResource = async (data: LockRequest) => {
	const response = await api.post<LockResponse>('/reservations/lock', data);
	return response.data;
};

export const unlockResource = async (data: LockRequest) => {
	return await api.post('/reservations/lock/unlock', data);
};

// NOVO: Centraliza a chamada para o RabbitMQ via Gateway
export const createReservation = async (data: any) => {
    return await api.post('/reservations', data);
};