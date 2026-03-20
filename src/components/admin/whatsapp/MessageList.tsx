/**
 * MessageList — lista de mensagens de uma conversa.
 * Balões estilo WhatsApp Web: inbound (esquerda), outbound (direita).
 * Scroll automático para a última mensagem.
 */
import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  messages: MessageItem[];
  loading?: boolean;
}

const statusIcon = (status: string) => {
  if (status === 'read')      return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
};

export function MessageList({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
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
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[#eae6df]">
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
              <div className={cn('flex items-center gap-1 mt-1', isOut ? 'justify-end' : 'justify-start')}>
                <span className="text-[10px] text-muted-foreground">{time}</span>
                {isOut && statusIcon(msg.status)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
