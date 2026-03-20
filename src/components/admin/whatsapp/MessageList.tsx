/**
 * MessageList — lista de mensagens de uma conversa.
 * Balões estilo WhatsApp Web: inbound (esquerda), outbound (direita).
 *
 * Comportamento de scroll:
 *   - Ao carregar uma nova conversa: scroll imediato para o fim
 *   - Ao receber nova mensagem em tempo real: scroll suave para o fim
 *   - Ao carregar mensagens mais antigas (cursor): preserva posição de scroll
 *
 * Paginação cursor-based:
 *   - Botão "Carregar mensagens anteriores" no topo, visível quando hasMore=true
 *   - Ao clicar, o pai é notificado via onLoadMore(cursor)
 */
import { useEffect, useRef, useLayoutEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  messages:       MessageItem[];
  loading?:       boolean;
  loadingMore?:   boolean;
  hasMore?:       boolean;
  nextCursor?:    string | null;
  onLoadMore?:    (cursor: string) => void;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'read')      return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
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

  // Ao carregar nova conversa (messages substituído inteiramente): scroll para o fim
  // Ao receber nova mensagem (+1 no final): scroll suave para o fim
  // Ao carregar mensagens anteriores (+N no início): restaura posição
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prevLen = prevLenRef.current;
    const currLen = messages.length;

    if (prevLen === 0 && currLen > 0) {
      // Primeira carga: scroll instantâneo ao fim
      container.scrollTop = container.scrollHeight;
    } else if (prevScrollRef.current && currLen > prevLen) {
      // Após "carregar mais": restaura posição de scroll relativa
      const { height, top } = prevScrollRef.current;
      const newHeight = container.scrollHeight;
      container.scrollTop = top + (newHeight - height);
      prevScrollRef.current = null;
    } else if (currLen > prevLen) {
      // Nova mensagem em tempo real: scroll suave para o fim
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
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando mensagens…
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Nenhuma mensagem ainda
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[#eae6df]"
    >
      {/* Botão de paginação — topo */}
      {hasMore && (
        <div className="flex justify-center pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-xs bg-white/80 hover:bg-white"
          >
            {loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
            )}
            Carregar mensagens anteriores
          </Button>
        </div>
      )}

      {messages.map((msg) => {
        const isOut = msg.direction === 'outbound';
        const time  = format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR });
        const body  = msg.type === 'text' ? msg.content : `[${msg.type}]`;

        return (
          <div
            key={msg.id}
            className={cn('flex', isOut ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[70%] px-3 py-2 rounded-lg shadow-sm text-sm relative',
                isOut
                  ? 'bg-[#dcf8c6] text-gray-900 rounded-br-none'
                  : 'bg-white text-gray-900 rounded-bl-none',
              )}
            >
              <p className="whitespace-pre-wrap break-words leading-snug">{body}</p>
              <div className={cn(
                'flex items-center gap-1 mt-1',
                isOut ? 'justify-end' : 'justify-start',
              )}>
                <span className="text-[10px] text-muted-foreground">{time}</span>
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
