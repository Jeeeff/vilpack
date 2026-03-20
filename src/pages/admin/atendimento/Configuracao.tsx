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
      // Evolution retorna base64 em data.qrcode.base64 ou data.base64
      const base64 =
        data?.qrcode?.base64 ?? data?.base64 ?? data?.qr ?? null;
      if (base64) {
        setQrCode(
          base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
        );
        setStatus('connecting');
      }
    } catch (e) {
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
        state === 'open' ? 'connected' :
        state === 'connecting' ? 'connecting' :
        'disconnected',
      );
    } catch (e) {
      setError('Não foi possível verificar o status da instância.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold">Configuração WhatsApp</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte sua instância da Evolution API ao painel de atendimento.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      <InstanceStatusCard status={status} />

      {status !== 'connected' && (
        <QRCodeConnectCard
          qrCode={qrCode}
          loading={loading}
          onRefresh={refreshQRCode}
        />
      )}

      {status === 'connected' && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">
          WhatsApp conectado e pronto para receber mensagens.
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={checkStatus}
          disabled={loading}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Verificar status
        </button>
      </div>
    </div>
  );
}
