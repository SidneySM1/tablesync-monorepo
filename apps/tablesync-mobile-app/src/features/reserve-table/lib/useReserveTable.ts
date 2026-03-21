import { useCallback, useState } from 'react';
import { lockResource, unlockResource } from '../api/reservation-api';
import { LockRequest, LockResponse } from '../model/types';

export const useReserveTable = () => {
    const [isLocking, setIsLocking] = useState(false);
    const [activeLock, setActiveLock] = useState<LockResponse | null>(null);
    const [lastRequest, setLastRequest] = useState<LockRequest | null>(null);

    const cancelLock = useCallback(async () => {
        if (!lastRequest) return;
        try {
            await unlockResource(lastRequest);
            setActiveLock(null);
            setLastRequest(null);
        } catch (error) {
            console.error('[Unlock Error]:', error);
        }
    }, [lastRequest]);

    const reserveLock = useCallback(async (request: LockRequest) => {
        try {
            setIsLocking(true);

            // CORREÇÃO: Se o usuário mudar de mesa, cancelamos o lock anterior no Redis
            if (activeLock && activeLock.tableId !== request.restaurantTableId) {
                await unlockResource(lastRequest!);
            }

            const response = await lockResource(request);
            
            // Garantimos que o token e o sectorId persistam no estado
            const fullResponse = { 
                ...response, 
                reservationToken: request.reservationToken,
                sectorId: response.sectorId || request.sectorId,
                reservationDate: response.reservationDate || request.reservationDate
            };
            
            setActiveLock(fullResponse);
            setLastRequest(request); 
            return fullResponse;
        } catch (error: any) {
            console.error('[Lock Error 400/409]:', error.response?.data || error.message);
            return null;
        } finally {
            setIsLocking(false);
        }
    }, [activeLock, lastRequest]);

    return { reserveLock, cancelLock, isLocking, activeLock };
};