/**
 * AtendimentoInbox — inbox principal do módulo WhatsApp.
 * Integrado ao design system CRM premium Vilpack.
 *
 * Etapa 4:
 *   - Paginação cursor-based de mensagens
 *   - Atualização de status via Socket.IO (whatsapp:message_status)
 *   - Shift+Enter: quebra de linha; Enter: enviar
 *   - Scroll automático inteligente
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import Configuracao from './Configuracao';
import Automacao    from './Automacao';
import { ConversationSidebar, type ConversationSummary } from '@/components/admin/whatsapp/ConversationSidebar';
import { ChatHeader } from '@/components/admin/whatsapp/ChatHeader';
import { MessageList, type MessageItem } from '@/components/admin/whatsapp/MessageList';
import { useWhatsappSocket, type MessageStatusPayload } from '@/hooks/useWhatsappSocket';
import { API_URL } from '@/config/api';
import { Send, MessageSquare, Settings, Bot } from 'lucide-react';

// ─── API helper ────────────────────────────────────────────────────────────────

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

// ─── types ─────────────────────────────────────────────────────────────────────

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

// ─── tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'inbox',  label: 'Inbox',       Icon: MessageSquare },
  { id: 'config', label: 'Configuração', Icon: Settings },
  { id: 'auto',   label: 'Automação',    Icon: Bot },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── component ─────────────────────────────────────────────────────────────────

export default function AtendimentoInbox() {
  const [activeTab, setActiveTab] = useState<TabId>('inbox');

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConvs,  setLoadingConvs]  = useState(false);
  const [selectedId,    setSelectedId]    = useState<string | undefined>();
  const [selectedConv,  setSelectedConv]  = useState<ConversationDetail | undefined>();

  const [messages,      setMessages]      = useState<MessageItem[]>([]);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(false);
  const [nextCursor,    setNextCursor]    = useState<string | null>(null);

  const [draft,  setDraft]  = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── conversations ────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await apiFetch('/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── messages ─────────────────────────────────────────────────────────────────

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
      await apiFetch(`/conversations/${convId}/read`, { method: 'POST' });
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c),
      );
    } catch {
      // silent
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedId(id);
    loadMessages(id);
  }, [loadMessages]);

  // ── load more ────────────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(async (cursor: string) => {
    if (!selectedId || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await apiFetch(
        `/conversations/${selectedId}/messages?limit=50&cursor=${cursor}`,
      ) as MessagePage;
      setMessages((prev) => [...page.messages, ...prev]);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [selectedId, loadingMore]);

  // ── send ─────────────────────────────────────────────────────────────────────

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
      if (result.message) setMessages((prev) => [...prev, result.message]);
    } catch {
      // silent
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
  };

  // ── handoff ──────────────────────────────────────────────────────────────────

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

  // ── socket ───────────────────────────────────────────────────────────────────

  useWhatsappSocket({
    onMessage: ({ conversationId, message }) => {
      if (conversationId === selectedId) {
        setMessages((prev) => [...prev, message as MessageItem]);
        apiFetch(`/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => c.id === conversationId ? { ...c, unreadCount: 0 } : c),
        );
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 }
              : c,
          ),
        );
      }
      loadConversations();
    },
    onMessageStatus: ({ conversationId, messageId, status }: MessageStatusPayload) => {
      if (conversationId === selectedId) {
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, status } : m),
        );
      }
    },
    onConversationUpdate: (conversation) => {
      const conv = conversation as Partial<ConversationSummary> & { id?: string };
      if (!conv.id) return;
      setConversations((prev) =>
        prev.map((c) => c.id === conv.id ? { ...c, ...conv } : c),
      );
    },
    onHandoff: ({ conversationId, botEnabled }) => {
      if (conversationId === selectedId) {
        setSelectedConv((prev) =>
          prev ? { ...prev, botEnabled, botPaused: !botEnabled } : prev,
        );
      }
    },
  });

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - 56px)' }}   /* 56px = topbar height */
    >
      {/* Tab bar */}
      <div
        className="flex border-b shrink-0 bg-white px-4 gap-0.5"
        style={{ borderColor: 'hsl(var(--admin-border))' }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors"
              style={{
                borderBottomColor: active ? 'hsl(var(--admin-yellow))' : 'transparent',
                color: active
                  ? 'hsl(var(--admin-text-primary))'
                  : 'hsl(var(--admin-text-muted))',
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'inbox' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div
            className="w-72 shrink-0 overflow-hidden flex flex-col border-r"
            style={{ borderColor: 'hsl(var(--admin-border))' }}
          >
            <ConversationSidebar
              conversations={conversations}
              selectedId={selectedId}
              onSelect={handleSelectConversation}
              loading={loadingConvs}
            />
          </div>

          {/* Chat area */}
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

                {/* Input area */}
                <div
                  className="border-t bg-white px-4 py-3 flex items-end gap-2 shrink-0"
                  style={{ borderColor: 'hsl(var(--admin-border))' }}
                >
                  <textarea
                    ref={textareaRef}
                    className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 min-h-[40px] max-h-32"
                    style={{
                      borderColor: 'hsl(var(--admin-border))',
                    }}
                    placeholder="Digite uma mensagem… (Enter envia, Shift+Enter quebra linha)"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors disabled:opacity-40"
                    style={{
                      background: 'hsl(var(--admin-yellow))',
                      color: '#1C1C1E',
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div
                className="flex-1 flex flex-col items-center justify-center gap-3"
                style={{ background: 'hsl(var(--admin-bg))' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'white', border: '1px solid hsl(var(--admin-border))' }}
                >
                  <MessageSquare size={22} style={{ color: 'hsl(var(--admin-text-muted))' }} />
                </div>
                <div className="text-center">
                  <p
                    className="font-medium text-sm"
                    style={{ color: 'hsl(var(--admin-text-secondary))' }}
                  >
                    Selecione uma conversa
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'hsl(var(--admin-text-muted))' }}
                  >
                    As mensagens aparecerão aqui
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div
          className="flex-1 overflow-auto p-6"
          style={{ background: 'hsl(var(--admin-bg))' }}
        >
          <Configuracao />
        </div>
      )}

      {activeTab === 'auto' && (
        <div
          className="flex-1 overflow-auto p-6"
          style={{ background: 'hsl(var(--admin-bg))' }}
        >
          <Automacao />
        </div>
      )}
    </div>
  );
}
