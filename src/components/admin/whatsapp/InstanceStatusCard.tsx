/**
 * InstanceStatusCard — exibe o status de conexão da instância WhatsApp.
 * Recebe status via prop (atualizado por Socket.IO no pai).
 */
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface Props {
  status: 'connected' | 'connecting' | 'disconnected';
  instanceName?: string;
}

const statusConfig = {
  connected:    { label: 'Conectado',    variant: 'default'     as const, Icon: Wifi },
  connecting:   { label: 'Conectando…', variant: 'secondary'   as const, Icon: Loader2 },
  disconnected: { label: 'Desconectado', variant: 'destructive' as const, Icon: WifiOff },
};

export function InstanceStatusCard({ status, instanceName }: Props) {
  const cfg = statusConfig[status] ?? statusConfig.disconnected;
  const { label, variant, Icon } = cfg;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white">
      <Icon className={`h-4 w-4 ${status === 'connecting' ? 'animate-spin' : ''}`} />
      <span className="text-sm font-medium">{instanceName ?? 'WhatsApp'}</span>
      <Badge variant={variant}>{label}</Badge>
    </div>
  );
}
