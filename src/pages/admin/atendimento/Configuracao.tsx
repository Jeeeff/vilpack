/**
 * Configuracao — tela de configuração da instância WhatsApp.
 * - Exibe status de conexão
 * - Exibe QR Code para conectar
 * - Atualiza em tempo real via Socket.IO (quando ADMIN_REALTIME_ENABLED)
 */
import { useState, useCallback } from 'react';
import { InstanceStatusCard } from '@/components/admin/whatsapp/InstanceStatusCard';
import { QRCodeConnectCard } from '@/components/admin/whatsapp/QRCodeConnectCard';
import { useWhatsappSocket } from '@/hooks/useWhatsappSocket';
import { API_URL } from '@/config/api';
import { Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

async function fetchFromApi(path: string, token: string) {
  const res = await fetch(`${API_URL}/admin/whatsapp${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function Configuracao() {
  const token = localStorage.getItem('admin_token') ?? '';

  const [status, setStatus]   = useState<ConnectionStatus>('disconnected');
  const [qrCode, setQrCode]   = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Atualização em tempo real via Socket.IO
  useWhatsappSocket({
    onInstanceStatus: ({ status: s, qrCode: qr }) => {
      setStatus((s as ConnectionStatus) ?? 'disconnected');
      if (qr) setQrCode(qr);
    },
  });

  const refreshQRCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFromApi('/instance/qrcode', token);
      const base64 =
        data?.qrcode?.base64 ?? data?.base64 ?? data?.qr ?? null;
      if (base64) {
        setQrCode(
          base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
        );
        setStatus('connecting');
      }
    } catch {
      setError('Não foi possível obter o QR Code. Verifique se a instância existe.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFromApi('/instance/status', token);
      const state = data?.instance?.state ?? data?.state ?? 'disconnected';
      setStatus(
        state === 'open'       ? 'connected'    :
        state === 'connecting' ? 'connecting'   :
        'disconnected',
      );
    } catch {
      setError('Não foi possível verificar o status da instância.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="admin-page-bg min-h-full p-6 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[hsl(var(--admin-yellow-soft))] flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-[hsl(42_80%_38%)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">
              Configuração WhatsApp
            </h2>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-0.5">
              Conecte sua instância da Evolution API ao painel de atendimento.
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 bg-[hsl(var(--admin-red-soft))] text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Status card */}
        <InstanceStatusCard status={status} />

        {/* QR Code card — only when not connected */}
        {status !== 'connected' && (
          <QRCodeConnectCard
            qrCode={qrCode}
            loading={loading}
            onRefresh={refreshQRCode}
          />
        )}

        {/* Connected success state */}
        {status === 'connected' && (
          <div className="flex items-center gap-3 bg-[hsl(var(--admin-green-soft))] text-[hsl(var(--admin-green))] text-sm px-4 py-3 rounded-xl border border-[hsl(142_60%_82%)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">WhatsApp conectado e pronto para receber mensagens.</span>
          </div>
        )}

        {/* Check status link */}
        <div className="flex items-center gap-2">
          <button
            onClick={checkStatus}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Verificar status manualmente
          </button>
        </div>

      </div>
    </div>
  );
}
