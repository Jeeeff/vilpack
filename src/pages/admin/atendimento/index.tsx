/**
 * AtendimentoInbox — layout principal do módulo de atendimento WhatsApp.
 * Estrutura: sidebar de conversas | área de chat
 *
 * Tabs:
 *   - Inbox:       lista de conversas + chat
 *   - Configuração: QR Code e status da instância
 *   - Automação:   regras do bot (placeholder Etapa 6)
 *
 * Etapa 4:
 *   - Paginação cursor-based de mensagens
 *   - Atualização de status de mensagem via Socket.IO (whatsapp:message_status)
 *   - Shift+Enter para quebra de linha; Enter para enviar
 *   - Scroll automático inteligente (nova msg vs. carregar mais)
 *   - Badge de não-lidas total no header da sidebar
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import Configuracao from './Configuracao';
import Automacao    from './Automacao';
import { ConversationSidebar, type ConversationSummary } from '@/components/admin/whatsapp/ConversationSidebar';
import { ChatHeader } from '@/components/admin/whatsapp/ChatHeader';
import { MessageList, type MessageItem } from '@/components/admin/whatsapp/MessageList';
import { useWhatsappSocket, type MessageStatusPayload } from '@/hooks/useWhatsappSocket';
import { API_URL } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, Settings, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers de API ───────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('admin_token') ?? '';
  const res = await fetch(`${API_URL}/admin/whatsapp${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── tipos locais ─────────────────────────────────────────────────────────────

interface ConversationDetail extends ConversationSummary {
  botPaused:  boolean;
  botEnabled: boolean;
  contact: {
    phone:     string;
    name?:     string | null;
    pushName?: string | null;
  };
}

interface MessagePage {
  messages:   MessageItem[];
  nextCursor: string | null;
  hasMore:    boolean;
}

// ─── tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'inbox',  label: 'Inbox',       Icon: MessageSquare },
  { id: 'config', label: 'Configuração', Icon: Settings },
  { id: 'auto',   label: 'Automação',    Icon: Bot },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── componente ───────────────────────────────────────────────────────────────

export default function AtendimentoInbox() {
  const [activeTab, setActiveTab] = useState<TabId>('inbox');

  // Conversas
  const [conversations, setConversations]   = useState<ConversationSummary[]>([]);
  const [loadingConvs, setLoadingConvs]     = useState(false);

  // Conversa selecionada
  const [selectedId, setSelectedId]         = useState<string | undefined>();
  const [selectedConv, setSelectedConv]     = useState<ConversationDetail | undefined>();

  // Mensagens + paginação
  const [messages, setMessages]             = useState<MessageItem[]>([]);
  const [loadingMsgs, setLoadingMsgs]       = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [hasMore, setHasMore]               = useState(false);
  const [nextCursor, setNextCursor]         = useState<string | null>(null);

  // Input
  const [draft, setDraft]                   = useState('');
  const [sending, setSending]               = useState(false);
  const textareaRef                         = useRef<HTMLTextAreaElement>(null);

  // ─── conversas ──────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await apiFetch('/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      // silencioso — sem banco ou sem instância ainda
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ─── mensagens (primeira carga) ─────────────────────────────────────────────

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    try {
      const [detail, page] = await Promise.all([
        apiFetch(`/conversations/${convId}`),
        apiFetch(`/conversations/${convId}/messages?limit=50`) as Promise<MessagePage>,
      ]);
      setSelectedConv(detail);
      setMessages(page.messages);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
      // Marca como lida
      await apiFetch(`/conversations/${convId}/read`, { method: 'POST' });
      // Zera unreadCount localmente (sem re-fetch completo)
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c),
      );
    } catch {
      // silencioso
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedId(id);
    loadMessages(id);
  }, [loadMessages]);

  // ─── paginação cursor-based (carregar mais) ──────────────────────────────────

  const handleLoadMore = useCallback(async (cursor: string) => {
    if (!selectedId || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await apiFetch(
        `/conversations/${selectedId}/messages?limit=50&cursor=${cursor}`,
      ) as MessagePage;
      // Prepend: mensagens mais antigas vêm antes das existentes
      setMessages((prev) => [...page.messages, ...prev]);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch {
      // silencioso
    } finally {
      setLoadingMore(false);
    }
  }, [selectedId, loadingMore]);

  // ─── envio de mensagem ───────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      const result = await apiFetch('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedId, text }),
      }) as { success: boolean; message: MessageItem };
      setDraft('');
      if (result.message) {
        setMessages((prev) => [...prev, result.message]);
      }
    } catch {
      // silencioso
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [draft, selectedId, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Shift+Enter: comportamento padrão (quebra de linha)
  };

  // ─── takeover / release ──────────────────────────────────────────────────────

  const handleTakeOver = useCallback(async () => {
    if (!selectedId) return;
    try {
      await apiFetch('/handoff/takeover', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedId }),
      });
      setSelectedConv((prev) => prev ? { ...prev, botPaused: true } : prev);
    } catch {}
  }, [selectedId]);

  const handleRelease = useCallback(async () => {
    if (!selectedId) return;
    try {
      await apiFetch('/handoff/release', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedId }),
      });
      setSelectedConv((prev) => prev ? { ...prev, botPaused: false } : prev);
    } catch {}
  }, [selectedId]);

  // ─── Socket.IO — tempo real ──────────────────────────────────────────────────

  useWhatsappSocket({
    // Nova mensagem recebida via webhook
    onMessage: ({ conversationId, message }) => {
      if (conversationId === selectedId) {
        setMessages((prev) => [...prev, message as MessageItem]);
        // Marca como lida automaticamente se a conversa está aberta
        apiFetch(`/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => c.id === conversationId ? { ...c, unreadCount: 0 } : c),
        );
      } else {
        // Incrementa unread da conversa não aberta
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 }
              : c,
          ),
        );
      }
      // Atualiza preview da sidebar
      loadConversations();
    },

    // Atualização de status de mensagem (delivered/read)
    onMessageStatus: ({ conversationId, messageId, status }: MessageStatusPayload) => {
      if (conversationId === selectedId) {
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, status } : m),
        );
      }
    },

    // Atualização geral de conversa (e.g. lastMessageAt)
    onConversationUpdate: (conversation) => {
      const conv = conversation as Partial<ConversationSummary> & { id?: string };
      if (!conv.id) return;
      setConversations((prev) =>
        prev.map((c) => c.id === conv.id ? { ...c, ...conv } : c),
      );
    },

    // Takeover via socket (outro admin ou bot)
    onHandoff: ({ conversationId, botEnabled }) => {
      if (conversationId === selectedId) {
        setSelectedConv((prev) =>
          prev ? { ...prev, botEnabled, botPaused: !botEnabled } : prev,
        );
      }
    },
  });

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full -m-8">
      {/* Tabs de navegação */}
      <div className="flex border-b bg-white px-4 gap-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors',
              activeTab === id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'inbox' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar de conversas */}
          <div className="w-72 border-r flex-shrink-0 overflow-hidden flex flex-col">
            <ConversationSidebar
              conversations={conversations}
              selectedId={selectedId}
              onSelect={handleSelectConversation}
              loading={loadingConvs}
            />
          </div>

          {/* Área de chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedConv ? (
              <>
                <ChatHeader
                  contactName={
                    selectedConv.contact.name ??
                    selectedConv.contact.pushName ??
                    selectedConv.contact.phone
                  }
                  contactPhone={selectedConv.contact.phone}
                  botPaused={selectedConv.botPaused}
                  status={selectedConv.status}
                  onTakeOver={handleTakeOver}
                  onRelease={handleRelease}
                />

                <MessageList
                  messages={messages}
                  loading={loadingMsgs}
                  loadingMore={loadingMore}
                  hasMore={hasMore}
                  nextCursor={nextCursor}
                  onLoadMore={handleLoadMore}
                />

                {/* Input de mensagem */}
                <div className="border-t bg-white px-4 py-3 flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-32"
                    placeholder="Digite uma mensagem… (Enter envia, Shift+Enter quebra linha)"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p className="text-sm">Selecione uma conversa para começar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="flex-1 overflow-auto p-8">
          <ConfiguracaoTab />
        </div>
      )}

      {activeTab === 'auto' && (
        <div className="flex-1 overflow-auto p-8">
          <AutomacaoTab />
        </div>
      )}
    </div>
  );
}

// ─── sub-páginas inline ───────────────────────────────────────────────────────

function ConfiguracaoTab() { return <Configuracao />; }
function AutomacaoTab()    { return <Automacao />; }
