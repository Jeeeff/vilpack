/**
 * ConversationSidebar — lista de conversas do inbox (coluna esquerda).
 * Estilo WhatsApp Web: avatar, nome, última mensagem, timestamp, badge unread.
 */
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConversationSummary {
  id:           string;
  contact: {
    phone:    string;
    name?:    string | null;
    pushName?: string | null;
  };
  status:       string;
  unreadCount:  number;
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
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b font-semibold text-sm">Conversas</div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Carregando…
        </div>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b font-semibold text-sm">Conversas</div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-8 text-center">
          <MessageCircle className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma conversa ainda</p>
          <p className="text-xs">As mensagens recebidas aparecerão aqui</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b font-semibold text-sm">
        Conversas ({conversations.length})
      </div>
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
                addSuffix: true,
                locale: ptBR,
              })
            : '';

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b',
                selectedId === conv.id && 'bg-muted',
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{displayName}</span>
                  {timeAgo && (
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {timeAgo}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{preview}</p>
                  {conv.unreadCount > 0 && (
                    <Badge className="ml-2 flex-shrink-0 bg-green-500 text-white text-xs px-1.5 min-w-[20px] text-center">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
