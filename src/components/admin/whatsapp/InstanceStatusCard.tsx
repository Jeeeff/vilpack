/**
 * InstanceStatusCard — exibe o status de conexão da instância WhatsApp.
 * Recebe status via prop (atualizado por Socket.IO no pai).
 */
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface Props {
  status: 'connected' | 'connecting' | 'disconnected';
  instanceName?: string;
}

export function InstanceStatusCard({ status, instanceName }: Props) {
  const config = {
    connected: {
      label: 'Conectado',
      icon: Wifi,
      dot: 'bg-[hsl(var(--admin-green))]',
      text: 'text-[hsl(var(--admin-green))]',
      bg: 'bg-[hsl(var(--admin-green-soft))]',
      border: 'border-[hsl(142_60%_82%)]',
    },
    connecting: {
      label: 'Conectando…',
      icon: Loader2,
      dot: 'bg-[hsl(var(--admin-yellow))]',
      text: 'text-[hsl(42_80%_38%)]',
      bg: 'bg-[hsl(var(--admin-yellow-soft))]',
      border: 'border-[hsl(42_97%_80%)]',
    },
    disconnected: {
      label: 'Desconectado',
      icon: WifiOff,
      dot: 'bg-red-400',
      text: 'text-red-600',
      bg: 'bg-[hsl(var(--admin-red-soft))]',
      border: 'border-red-200',
    },
  };

  const cfg = config[status] ?? config.disconnected;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border admin-card ${cfg.bg} ${cfg.border}`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
      <Icon className={`h-4 w-4 shrink-0 ${cfg.text} ${status === 'connecting' ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">
          {instanceName ?? 'WhatsApp'}
        </p>
        <p className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
      </div>
    </div>
  );
}
