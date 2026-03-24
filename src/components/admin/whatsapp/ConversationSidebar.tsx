/**
 * ConversationSidebar — lista de conversas do inbox (coluna esquerda).
 * Estilo CRM premium Vilpack: alinhado ao novo design system do admin.
 */
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Loader2 } from 'lucide-react';

export interface ConversationSummary {
  id:            string;
  contact: {
    phone:     string;
    name?:     string | null;
    pushName?: string | null;
  };
  status:        string;
  unreadCount:   number;
  lastMessageAt?: string | null;
  messages?: Array<{ content?: string | null; type: string }>;
}

interface Props {
  conversations: ConversationSummary[];
  selectedId?:   string;
  onSelect:      (id: string) => void;
  loading?:      boolean;
}

export function ConversationSidebar({ conversations, selectedId, onSelect, loading }: Props) {
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <div className="flex flex-col h-full" style={{ background: 'white' }}>
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'hsl(var(--admin-border))' }}
      >
        <div>
          <span
            className="font-semibold text-sm"
            style={{ color: 'hsl(var(--admin-text-primary))' }}
          >
            Conversas
          </span>
          {conversations.length > 0 && (
            <span
              className="text-xs ml-1.5"
              style={{ color: 'hsl(var(--admin-text-muted))' }}
            >
              {conversations.length}
            </span>
          )}
        </div>
        {totalUnread > 0 && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#DC2626', color: '#fff', minWidth: '22px', textAlign: 'center' }}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-sm"
          style={{ color: 'hsl(var(--admin-text-muted))' }}>
          <Loader2 size={14} className="animate-spin" />
          Carregando…
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'hsl(var(--admin-bg))' }}
          >
            <MessageCircle size={20} style={{ color: 'hsl(var(--admin-text-muted))' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--admin-text-secondary))' }}>
              Nenhuma conversa ainda
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--admin-text-muted))' }}>
              As mensagens recebidas aparecerão aqui
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => {
            const displayName =
              conv.contact.name ?? conv.contact.pushName ?? conv.contact.phone;
            const lastMsg = conv.messages?.[0];
            const preview =
              lastMsg?.type === 'text'
                ? (lastMsg?.content ?? '')
                : lastMsg?.type
                ? `[${lastMsg.type}]`
                : '';
            const timeAgo = conv.lastMessageAt
              ? formatDistanceToNow(new Date(conv.lastMessageAt), {
                  addSuffix: false,
                  locale: ptBR,
                })
              : '';

            const isSelected = selectedId === conv.id;
            const hasUnread  = conv.unreadCount > 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b"
                style={{
                  borderColor: 'hsl(var(--admin-border))',
                  background: isSelected
                    ? 'hsl(var(--admin-yellow-soft))'
                    : 'white',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'hsl(var(--admin-bg))';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'white';
                }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 select-none"
                  style={{
                    background: isSelected
                      ? 'hsl(var(--admin-yellow))'
                      : 'hsl(var(--admin-sidebar-bg))',
                    color: isSelected ? '#1C1C1E' : '#fff',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-sm truncate"
                      style={{
                        fontWeight: hasUnread ? 700 : 500,
                        color: 'hsl(var(--admin-text-primary))',
                      }}
                    >
                      {displayName}
                    </span>
                    {timeAgo && (
                      <span
                        className="text-[10px] shrink-0"
                        style={{
                          color: hasUnread
                            ? 'hsl(var(--admin-yellow))'
                            : 'hsl(var(--admin-text-muted))',
                          fontWeight: hasUnread ? 600 : 400,
                        }}
                      >
                        {timeAgo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5 gap-2">
                    <p
                      className="text-xs truncate"
                      style={{
                        color: hasUnread
                          ? 'hsl(var(--admin-text-primary))'
                          : 'hsl(var(--admin-text-muted))',
                        fontWeight: hasUnread ? 500 : 400,
                      }}
                    >
                      {preview || '—'}
                    </p>
                    {hasUnread && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: 'hsl(var(--admin-yellow))',
                          color: '#1C1C1E',
                          minWidth: '20px',
                          textAlign: 'center',
                        }}
                      >
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
