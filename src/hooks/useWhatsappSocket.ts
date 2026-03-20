/**
 * useWhatsappSocket — conecta ao Socket.IO do painel admin.
 *
 * Entra na sala 'admin' via evento 'join_admin'.
 * Expõe callbacks para os eventos do módulo WhatsApp.
 * Só conecta quando ADMIN_REALTIME_ENABLED = true.
 */
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { featureFlags } from '@/lib/featureFlags';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:3001';

export interface WhatsappSocketHandlers {
  onMessage?:            (payload: { conversationId: string; message: unknown }) => void;
  onConversationUpdate?: (conversation: unknown) => void;
  onInstanceStatus?:     (payload: { status: string; qrCode?: string }) => void;
  onHandoff?:            (payload: { conversationId: string; botEnabled: boolean }) => void;
}

export function useWhatsappSocket(handlers: WhatsappSocketHandlers) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!featureFlags.ADMIN_REALTIME_ENABLED) return;

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_admin');
    });

    if (handlers.onMessage) {
      socket.on('whatsapp:message', handlers.onMessage);
    }
    if (handlers.onConversationUpdate) {
      socket.on('whatsapp:conversation_update', handlers.onConversationUpdate);
    }
    if (handlers.onInstanceStatus) {
      socket.on('whatsapp:instance_status', handlers.onInstanceStatus);
    }
    if (handlers.onHandoff) {
      socket.on('whatsapp:handoff', handlers.onHandoff);
    }

    return () => {
      socket.emit('leave_admin');
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef;
}
