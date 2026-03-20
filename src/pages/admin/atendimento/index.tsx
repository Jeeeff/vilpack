/**
 * AtendimentoInbox — layout principal do módulo de atendimento WhatsApp.
 * Estrutura: sidebar de conversas | área de chat | (futuramente) painel de info
 *
 * Tabs de navegação interna:
 *   - Inbox: lista de conversas + chat
 *   - Configuração: QR Code e status da instância
 *   - Automação: regras do bot (placeholder Etapa 6)
 */
import { useState, useEffect, useCallback } from 'react';
import Configuracao from './Configuracao';
import Automacao from './Automacao';
import { Link, useLocation } from 'react-router-dom';
import { ConversationSidebar, type ConversationSummary } from '@/components/admin/whatsapp/ConversationSidebar';
import { ChatHeader } from '@/components/admin/whatsapp/ChatHeader';
import { MessageList, type MessageItem } from '@/components/admin/whatsapp/MessageList';
import { useWhatsappSocket } from '@/hooks/useWhatsappSocket';
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
    phone:    string;
    name?:    string | null;
    pushName?: string | null;
  };
}

// ─── tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'inbox',   label: 'Inbox',        Icon: MessageSquare },
  { id: 'config',  label: 'Configuração',  Icon: Settings },
  { id: 'auto',    label: 'Automação',     Icon: Bot },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── componente ───────────────────────────────────────────────────────────────

export default function AtendimentoInbox() {
  const [activeTab, setActiveTab] = useState<TabId>('inbox');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId]       = useState<string | undefined>();
  const [selectedConv, setSelectedConv]   = useState<ConversationDetail | undefined>();
  const [messages, setMessages]           = useState<MessageItem[]>([]);
  const [draft, setDraft]                 = useState('');
  const [loadingConvs, setLoadingConvs]   = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);

  // Carrega lista de conversas
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

  // Carrega mensagens da conversa selecionada
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const [detail, msgs] = await Promise.all([
        apiFetch(`/conversations/${convId}`),
        apiFetch(`/conversations/${convId}/messages`),
      ]);
      setSelectedConv(detail);
      setMessages(Array.isArray(msgs) ? msgs : []);
      // Marca como lida
      await apiFetch(`/conversations/${convId}/read`, { method: 'POST' });
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

  // Envio de mensagem
  const handleSend = useCallback(async () => {
    if (!draft.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      await apiFetch('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedId, text: draft.trim() }),
      });
      setDraft('');
      await loadMessages(selectedId);
    } catch {
      // silencioso
    } finally {
      setSending(false);
    }
  }, [draft, selectedId, sending, loadMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Takeover / release
  const handleTakeOver = useCallback(async () => {
    if (!selectedId) return;
    try {
      await apiFetch('/handoff/takeover', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedId }),
      });
      await loadMessages(selectedId);
    } catch {}
  }, [selectedId, loadMessages]);

  const handleRelease = useCallback(async () => {
    if (!selectedId) return;
    try {
      await apiFetch('/handoff/release', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedId }),
      });
      await loadMessages(selectedId);
    } catch {}
  }, [selectedId, loadMessages]);

  // Socket.IO — atualiza em tempo real
  useWhatsappSocket({
    onMessage: ({ conversationId, message }) => {
      if (conversationId === selectedId) {
        setMessages((prev) => [...prev, message as MessageItem]);
      }
      loadConversations();
    },
    onConversationUpdate: () => {
      loadConversations();
    },
  });

  // ─── render ────────────────────────────────────────────────────────────────

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

                <MessageList messages={messages} loading={loadingMsgs} />

                {/* Input de mensagem */}
                <div className="border-t bg-white px-4 py-3 flex items-end gap-2">
                  <textarea
                    className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-32"
                    placeholder="Digite uma mensagem… (Enter para enviar)"
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
          {/* Importação dinâmica para não bloquear o bundle */}
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

// ─── sub-páginas inline (evita rotas extras) ─────────────────────────────────

function ConfiguracaoTab() { return <Configuracao />; }
function AutomacaoTab()    { return <Automacao />; }
