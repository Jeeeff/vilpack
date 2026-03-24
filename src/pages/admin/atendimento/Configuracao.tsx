/**
 * Configuracao — tela de configuração da instância WhatsApp.
 *
 * Estados de conexão distintos:
 *   connected       → WhatsApp conectado, sem QR
 *   connecting      → Aguardando scan do QR
 *   disconnected    → Instância desconectada
 *   qr_unavailable  → Evolution online mas QR ainda não gerado (202)
 *   provider_error  → Evolution offline / API key inválida / instância não existe
 *   config_missing  → Variáveis de ambiente não configuradas
 */
import { useState, useCallback } from 'react';
import { InstanceStatusCard } from '@/components/admin/whatsapp/InstanceStatusCard';
import { QRCodeConnectCard } from '@/components/admin/whatsapp/QRCodeConnectCard';
import { useWhatsappSocket } from '@/hooks/useWhatsappSocket';
import { API_URL } from '@/config/api';
import { Smartphone, RefreshCw, CheckCircle2, AlertTriangle, Settings2, WifiOff } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

type UiError =
  | { code: 'PROVIDER_OFFLINE';   message: string }
  | { code: 'INSTANCE_NOT_FOUND'; message: string }
  | { code: 'AUTH_ERROR';         message: string }
  | { code: 'QR_NOT_AVAILABLE';   message: string }
  | { code: 'CONFIG_MISSING';     message: string }
  | { code: 'FEATURE_DISABLED';   message: string }
  | { code: 'GENERIC';            message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchFromApi(path: string, token: string) {
  const res = await fetch(`${API_URL}/admin/whatsapp${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Tenta parsear sempre para capturar o `code` do erro
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Mapeia o code semântico do backend para o UiError
    const code = data?.code as string | undefined;
    const hint = data?.hint ?? data?.error ?? `HTTP ${res.status}`;
    throw { httpStatus: res.status, code, hint };
  }

  return data;
}

function classifyError(err: unknown): UiError {
  if (err && typeof err === 'object' && 'code' in err) {
    const e = err as { code: string; hint: string; httpStatus: number };

    if (e.code === 'PROVIDER_OFFLINE' || e.code === 'FEATURE_DISABLED')
      return { code: 'PROVIDER_OFFLINE', message: e.hint };
    if (e.code === 'INSTANCE_NOT_FOUND')
      return { code: 'INSTANCE_NOT_FOUND', message: e.hint };
    if (e.code === 'AUTH_ERROR')
      return { code: 'AUTH_ERROR', message: e.hint };
    if (e.code === 'QR_NOT_AVAILABLE')
      return { code: 'QR_NOT_AVAILABLE', message: e.hint };
    if (e.code === 'CONFIG_MISSING')
      return { code: 'CONFIG_MISSING', message: e.hint };
    if (e.code === 'FEATURE_DISABLED')
      return { code: 'FEATURE_DISABLED', message: e.hint };
    return { code: 'GENERIC', message: e.hint };
  }
  return { code: 'GENERIC', message: 'Não foi possível comunicar com o servidor.' };
}

// ─── Componente de banner de erro ─────────────────────────────────────────────

function ErrorBanner({ err }: { err: UiError }) {
  const icons: Record<UiError['code'], React.ReactNode> = {
    PROVIDER_OFFLINE:   <WifiOff size={15} className="shrink-0 mt-0.5" />,
    INSTANCE_NOT_FOUND: <Settings2 size={15} className="shrink-0 mt-0.5" />,
    AUTH_ERROR:         <AlertTriangle size={15} className="shrink-0 mt-0.5" />,
    QR_NOT_AVAILABLE:   <RefreshCw size={15} className="shrink-0 mt-0.5" />,
    CONFIG_MISSING:     <Settings2 size={15} className="shrink-0 mt-0.5" />,
    FEATURE_DISABLED:   <AlertTriangle size={15} className="shrink-0 mt-0.5" />,
    GENERIC:            <AlertTriangle size={15} className="shrink-0 mt-0.5" />,
  };

  const titles: Record<UiError['code'], string> = {
    PROVIDER_OFFLINE:   'Evolution API offline',
    INSTANCE_NOT_FOUND: 'Instância não encontrada',
    AUTH_ERROR:         'Erro de autenticação',
    QR_NOT_AVAILABLE:   'QR Code ainda não disponível',
    CONFIG_MISSING:     'Configuração incompleta',
    FEATURE_DISABLED:   'Módulo desabilitado',
    GENERIC:            'Erro de comunicação',
  };

  const isWarning = err.code === 'QR_NOT_AVAILABLE';

  return (
    <div
      className={`flex items-start gap-3 text-sm px-4 py-3 rounded-xl border ${
        isWarning
          ? 'bg-[hsl(var(--admin-yellow-soft))] text-amber-700 border-amber-200'
          : 'bg-[hsl(var(--admin-red-soft))] text-red-700 border-red-200'
      }`}
    >
      {icons[err.code]}
      <div>
        <p className="font-semibold">{titles[err.code]}</p>
        <p className="text-xs mt-0.5 opacity-80">{err.message}</p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Configuracao() {
  const token = localStorage.getItem('admin_token') ?? '';

  const [status,  setStatus]  = useState<ConnectionStatus>('disconnected');
  const [qrCode,  setQrCode]  = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState<UiError | null>(null);

  // Atualização em tempo real via Socket.IO
  useWhatsappSocket({
    onInstanceStatus: ({ status: s, qrCode: qr }) => {
      setStatus((s as ConnectionStatus) ?? 'disconnected');
      if (qr) {
        setQrCode(qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`);
        setUiError(null);
      }
    },
  });

  const refreshQRCode = useCallback(async () => {
    setLoading(true);
    setUiError(null);
    try {
      const data = await fetchFromApi('/instance/qrcode', token);

      // ALREADY_CONNECTED chega como HTTP 200 com code no body quando tratado
      if (data?.code === 'ALREADY_CONNECTED') {
        setStatus('connected');
        setLoading(false);
        return;
      }

      const base64 =
        data?.qrcode?.base64 ?? data?.base64 ?? data?.qr ?? null;

      if (base64) {
        setQrCode(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
        setStatus('connecting');
      } else {
        setUiError({ code: 'QR_NOT_AVAILABLE', message: 'Evolution respondeu mas sem QR Code. Tente novamente em alguns segundos.' });
      }
    } catch (err) {
      const classified = classifyError(err);
      // QR_NOT_AVAILABLE (202) é informativo, não um erro crítico
      if (classified.code === 'QR_NOT_AVAILABLE') {
        setUiError(classified);
      } else {
        setUiError(classified);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setUiError(null);
    try {
      const data = await fetchFromApi('/instance/status', token);
      const state = data?.instance?.state ?? data?.state ?? 'disconnected';
      setStatus(
        state === 'open'       ? 'connected'  :
        state === 'connecting' ? 'connecting' :
        'disconnected',
      );
    } catch (err) {
      setUiError(classifyError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="admin-page">
      <div className="max-w-lg mx-auto space-y-5">

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

        {/* Error / warning banner */}
        {uiError && <ErrorBanner err={uiError} />}

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
