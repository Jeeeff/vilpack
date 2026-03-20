/**
 * useWhatsappSocket — conecta ao Socket.IO do painel admin.
 *
 * Entra na sala 'admin' via evento 'join_admin'.
 * Expõe callbacks para os eventos do módulo WhatsApp.
 * Só conecta quando ADMIN_REALTIME_ENABLED = true.
 *
 * Os handlers são atualizados via ref para que mudanças de closure
 * não causem reconexão do socket.
 */
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { featureFlags } from '@/lib/featureFlags';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:3001';

export interface MessageStatusPayload {
  conversationId:    string;
  providerMessageId: string | null;
  messageId:         string;
  status:            string;
}

export interface WhatsappSocketHandlers {
  onMessage?:            (payload: { conversationId: string; message: unknown }) => void;
  onConversationUpdate?: (conversation: unknown) => void;
  onInstanceStatus?:     (payload: { status: string; qrCode?: string }) => void;
  onHandoff?:            (payload: { conversationId: string; botEnabled: boolean }) => void;
  onMessageStatus?:      (payload: MessageStatusPayload) => void;
}

export function useWhatsappSocket(handlers: WhatsappSocketHandlers) {
  const socketRef  = useRef<Socket | null>(null);
  // Mantém referência sempre atualizada sem reconectar o socket
  const handlersRef = useRef<WhatsappSocketHandlers>(handlers);
  handlersRef.current = handlers;

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

    socket.on('whatsapp:message', (payload: { conversationId: string; message: unknown }) => {
      handlersRef.current.onMessage?.(payload);
    });

    socket.on('whatsapp:conversation_update', (conversation: unknown) => {
      handlersRef.current.onConversationUpdate?.(conversation);
    });

    socket.on('whatsapp:instance_status', (payload: { status: string; qrCode?: string }) => {
      handlersRef.current.onInstanceStatus?.(payload);
    });

    socket.on('whatsapp:handoff', (payload: { conversationId: string; botEnabled: boolean }) => {
      handlersRef.current.onHandoff?.(payload);
    });

    socket.on('whatsapp:message_status', (payload: MessageStatusPayload) => {
      handlersRef.current.onMessageStatus?.(payload);
    });

    return () => {
      socket.emit('leave_admin');
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef;
}
