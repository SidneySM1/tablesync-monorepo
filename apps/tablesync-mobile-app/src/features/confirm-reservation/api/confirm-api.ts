import { api } from '@shared/api/api-client';
import { ReservationRequest } from '../model/types';

export const confirmReservation = async (data: ReservationRequest) => {
	// Endpoint /api/reservations que injeta no RabbitMQ
	const response = await api.post('/reservations', data);
	return response.data;
};