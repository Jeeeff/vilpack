/**
 * whatsappRealtimeService — emissão de eventos via Socket.IO para o painel admin.
 * O socket server é injetado em runtime via init().
 * Antes de init(), todos os emits são no-ops seguros.
 */
import type { Server as SocketServer } from 'socket.io';
import { featureFlags } from '../config/featureFlags.js';

let io: SocketServer | null = null;

export const whatsappRealtimeService = {
  /** Chamado uma vez em server.ts após criar o Socket.IO server */
  init(socketServer: SocketServer) {
    io = socketServer;
    console.log('[Realtime] Socket.IO inicializado para o módulo WhatsApp');
  },

  emit(event: string, payload: unknown) {
    if (!featureFlags.ADMIN_REALTIME_ENABLED || !io) return;
    io.to('admin').emit(event, payload);
  },

  /** Nova mensagem recebida/enviada */
  emitNewMessage(conversationId: string, message: unknown) {
    this.emit('whatsapp:message', { conversationId, message });
  },

  /** Status da instância mudou (connected/disconnected/qr) */
  emitInstanceStatus(status: string, qrCode?: string) {
    this.emit('whatsapp:instance_status', { status, qrCode });
  },

  /** Lista de conversas atualizada */
  emitConversationUpdate(conversation: unknown) {
    this.emit('whatsapp:conversation_update', conversation);
  },

  /** Takeover ou retorno ao bot */
  emitHandoffChange(conversationId: string, botEnabled: boolean) {
    this.emit('whatsapp:handoff', { conversationId, botEnabled });
  },
};
