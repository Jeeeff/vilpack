/**
 * ChatHeader — cabeçalho da área de chat.
 * Visual integrado ao design system CRM premium Vilpack.
 */
import { UserCheck, Bot, BotOff, Phone } from 'lucide-react';

interface Props {
  contactName:  string;
  contactPhone: string;
  botPaused:    boolean;
  status:       string;
  onTakeOver?:  () => void;
  onRelease?:   () => void;
}

const STATUS_LABEL: Record<string, string> = {
  open:     'Aberta',
  resolved: 'Resolvida',
  pending:  'Pendente',
};

export function ChatHeader({
  contactName,
  contactPhone,
  botPaused,
  status,
  onTakeOver,
  onRelease,
}: Props) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-white"
      style={{ borderColor: 'hsl(var(--admin-border))' }}
    >
      {/* Contact info */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 select-none"
          style={{ background: 'hsl(var(--admin-sidebar-bg))', color: '#fff' }}
        >
          {contactName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p
            className="font-semibold text-sm leading-tight"
            style={{ color: 'hsl(var(--admin-text-primary))' }}
          >
            {contactName}
          </p>
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: 'hsl(var(--admin-text-muted))' }}
          >
            <Phone size={10} />
            {contactPhone}
          </p>
        </div>

        {/* Status badge */}
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full border"
          style={{
            borderColor: 'hsl(var(--admin-border))',
            color: 'hsl(var(--admin-text-secondary))',
            background: 'hsl(var(--admin-bg))',
          }}
        >
          {STATUS_LABEL[status] ?? status}
        </span>

        {/* Human takeover badge */}
        {botPaused && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'hsl(var(--admin-yellow-soft))',
              color: '#B45309',
              border: '1px solid #FDE68A',
            }}
          >
            Atendimento humano
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {botPaused ? (
          <button
            onClick={onRelease}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-colors border"
            style={{
              borderColor: 'hsl(var(--admin-border))',
              color: 'hsl(var(--admin-text-secondary))',
              background: 'white',
            }}
          >
            <Bot size={13} />
            Devolver ao bot
          </button>
        ) : (
          <button
            onClick={onTakeOver}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: 'hsl(var(--admin-yellow))',
              color: '#1C1C1E',
            }}
          >
            <UserCheck size={13} />
            Assumir atendimento
          </button>
        )}

        {/* Bot state indicator */}
        {botPaused ? (
          <BotOff size={16} style={{ color: '#B45309' }} />
        ) : (
          <Bot size={16} style={{ color: 'hsl(var(--admin-green))' }} />
        )}
      </div>
    </div>
  );
}
