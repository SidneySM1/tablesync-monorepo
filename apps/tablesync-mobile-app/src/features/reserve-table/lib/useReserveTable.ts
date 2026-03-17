import { useCallback, useState } from 'react';
import { lockResource, unlockResource } from '../api/reservation-api';
import { LockRequest, LockResponse } from '../model/types';

export const useReserveTable = () => {
    const [isLocking, setIsLocking] = useState(false);
    const [activeLock, setActiveLock] = useState<LockResponse | null>(null);
    // Guardamos o último request para saber o que cancelar
    const [lastRequest, setLastRequest] = useState<LockRequest | null>(null);

    const reserveLock = useCallback(async (request: LockRequest) => {
        try {
            setIsLocking(true);
            const response = await lockResource(request);
            
            // Injetamos o token no response caso o C# não devolva, 
            // para manter o rastreio no front
            const fullResponse = { ...response, reservationToken: request.reservationToken };
            
            setActiveLock(fullResponse);
            setLastRequest(request); // Salvamos o "contexto" do lock
            return fullResponse;
        } catch (error: any) {
            // ... seu tratamento de erro (409, etc)
            return null;
        } finally {
            setIsLocking(false);
        }
    }, []);

    const cancelLock = useCallback(async () => {
        if (!lastRequest) return;

        try {
            // Usamos o lastRequest que já tem o setor, mesa e data
            await unlockResource(lastRequest);
            setActiveLock(null);
            setLastRequest(null);
        } catch (error) {
            console.error('[Unlock Error]:', error);
        }
    }, [lastRequest]);

    return {
        reserveLock,
        cancelLock,
        isLocking,
        activeLock
    };
};