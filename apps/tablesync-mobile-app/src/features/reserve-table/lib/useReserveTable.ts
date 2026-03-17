import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { lockResource, unlockResource } from '../api/reservation-api';
import { LockRequest, LockResponse } from '../model/types';

export const useReserveTable = () => {
	const [isLocking, setIsLocking] = useState(false);
	const [activeLock, setActiveLock] = useState<LockResponse | null>(null);

	/**
	 * Tenta realizar o lock (Mesa VIP, Deck Auto ou Pista)
	 */
	const reserveLock = useCallback(async (request: LockRequest) => {
		try {
			setIsLocking(true);
			
			// Chama o endpoint unificado da Gateway
			const response = await lockResource(request);
			
			setActiveLock(response);
			return response;
		} catch (error: any) {
			// Trata especificamente o 409 Conflict (Mesa já ocupada ou setor lotado)
			if (error.response?.status === 409) {
				Alert.alert('Indisponível', error.response.data.message || 'Este lugar acabou de ser ocupado.');
			} else {
				Alert.alert('Erro', 'Não foi possível contactar o servidor em Fortaleza.');
			}
			return null;
		} finally {
			setIsLocking(false);
		}
	}, []);

	/**
	 * Cancela o lock se o utilizador desistir ou voltar atrás
	 */
	const cancelLock = useCallback(async (request: LockRequest) => {
		try {
			await unlockResource(request);
			setActiveLock(null);
		} catch (error) {
			console.error('[Unlock Error]:', error);
		}
	}, []);

	return {
		reserveLock,
		cancelLock,
		isLocking,
		activeLock
	};
};