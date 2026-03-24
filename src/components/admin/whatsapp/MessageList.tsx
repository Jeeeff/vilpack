/**
 * MessageList — lista de mensagens de uma conversa.
 * Visual integrado ao design system CRM premium Vilpack.
 *
 * Scroll behavior:
 *   - Nova conversa: scroll instantâneo para o fim
 *   - Nova mensagem em tempo real: scroll suave para o fim
 *   - Carregar mais antigas: preserva posição de scroll
 */
import { useLayoutEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, ChevronUp, Loader2 } from 'lucide-react';

export interface MessageItem {
  id:        string;
  direction: 'inbound' | 'outbound';
  fromMe:    boolean;
  type:      string;
  content?:  string | null;
  status:    string;
  timestamp: string;
}

interface Props {
  messages:     MessageItem[];
  loading?:     boolean;
  loadingMore?: boolean;
  hasMore?:     boolean;
  nextCursor?:  string | null;
  onLoadMore?:  (cursor: string) => void;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'read')
    return <CheckCheck size={13} style={{ color: '#60A5FA' }} />;
  if (status === 'delivered')
    return <CheckCheck size={13} style={{ color: 'hsl(var(--admin-text-muted))' }} />;
  return <Check size={13} style={{ color: 'hsl(var(--admin-text-muted))' }} />;
}

export function MessageList({
  messages,
  loading,
  loadingMore,
  hasMore,
  nextCursor,
  onLoadMore,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const prevLenRef    = useRef(0);
  const prevScrollRef = useRef<{ height: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevLen = prevLenRef.current;
    const currLen = messages.length;

    if (prevLen === 0 && currLen > 0) {
      container.scrollTop = container.scrollHeight;
    } else if (prevScrollRef.current && currLen > prevLen) {
      const { height, top } = prevScrollRef.current;
      container.scrollTop = top + (container.scrollHeight - height);
      prevScrollRef.current = null;
    } else if (currLen > prevLen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevLenRef.current = currLen;
  }, [messages]);

  const handleLoadMore = () => {
    if (!nextCursor || !onLoadMore) return;
    const container = containerRef.current;
    if (container) {
      prevScrollRef.current = {
        height: container.scrollHeight,
        top:    container.scrollTop,
      };
    }
    onLoadMore(nextCursor);
  };

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center gap-2 text-sm"
        style={{ background: 'hsl(var(--admin-bg))', color: 'hsl(var(--admin-text-muted))' }}
      >
        <Loader2 size={14} className="animate-spin" />
        Carregando mensagens…
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-sm"
        style={{ background: 'hsl(var(--admin-bg))', color: 'hsl(var(--admin-text-muted))' }}
      >
        Nenhuma mensagem ainda
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
      style={{ background: 'hsl(40 20% 96%)' }}
    >
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium transition-colors border"
            style={{
              background: 'white',
              borderColor: 'hsl(var(--admin-border))',
              color: 'hsl(var(--admin-text-secondary))',
            }}
          >
            {loadingMore ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <ChevronUp size={11} />
            )}
            Carregar mensagens anteriores
          </button>
        </div>
      )}

      {messages.map((msg) => {
        const isOut = msg.direction === 'outbound';
        const time  = format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR });
        const body  = msg.type === 'text' ? msg.content : `[${msg.type}]`;

        return (
          <div
            key={msg.id}
            className="flex"
            style={{ justifyContent: isOut ? 'flex-end' : 'flex-start' }}
          >
            <div
              className="max-w-[72%] px-3 py-2 text-sm shadow-sm"
              style={
                isOut
                  ? {
                      background: '#DCF8C6',
                      color: '#1C1C1E',
                      borderRadius: '14px 14px 4px 14px',
                    }
                  : {
                      background: 'white',
                      color: '#1C1C1E',
                      borderRadius: '14px 14px 14px 4px',
                    }
              }
            >
              <p className="whitespace-pre-wrap break-words leading-snug text-sm">{body}</p>
              <div
                className="flex items-center gap-1 mt-1"
                style={{ justifyContent: isOut ? 'flex-end' : 'flex-start' }}
              >
                <span style={{ fontSize: '10px', color: 'hsl(var(--admin-text-muted))' }}>
                  {time}
                </span>
                {isOut && <StatusIcon status={msg.status} />}
              </div>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
