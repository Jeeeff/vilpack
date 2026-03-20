/**
 * ChatHeader — cabeçalho da área de chat com info do contato e ações.
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Bot, BotOff } from 'lucide-react';

interface Props {
  contactName:  string;
  contactPhone: string;
  botPaused:    boolean;
  status:       string;
  onTakeOver?:  () => void;
  onRelease?:   () => void;
}

export function ChatHeader({
  contactName,
  contactPhone,
  botPaused,
  status,
  onTakeOver,
  onRelease,
}: Props) {
  const statusVariant =
    status === 'open'     ? 'default'     :
    status === 'resolved' ? 'secondary'   :
    status === 'pending'  ? 'outline'     : 'secondary';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
      {/* Info do contato */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
          {contactName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-sm">{contactName}</p>
          <p className="text-xs text-muted-foreground">{contactPhone}</p>
        </div>
        <Badge variant={statusVariant} className="ml-2 text-xs">
          {status}
        </Badge>
        {botPaused && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
            Atendimento humano
          </Badge>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {botPaused ? (
          <Button size="sm" variant="outline" onClick={onRelease}>
            <Bot className="mr-1 h-4 w-4" />
            Devolver ao bot
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onTakeOver}>
            <UserCheck className="mr-1 h-4 w-4" />
            Assumir atendimento
          </Button>
        )}
        {botPaused ? (
          <BotOff className="h-4 w-4 text-amber-500" />
        ) : (
          <Bot className="h-4 w-4 text-green-500" />
        )}
      </div>
    </div>
  );
}
