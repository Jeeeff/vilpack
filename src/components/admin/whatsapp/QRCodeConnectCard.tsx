/**
 * QRCodeConnectCard — exibe o QR Code para conexão da instância WhatsApp.
 * O QR Code é recebido via prop (base64 da Evolution API ou via Socket.IO).
 */
import { QrCode, RefreshCw } from 'lucide-react';

interface Props {
  qrCode?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function QRCodeConnectCard({ qrCode, loading, onRefresh }: Props) {
  return (
    <div className="admin-card rounded-2xl border border-[hsl(var(--admin-border))] p-6 flex flex-col items-center gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[hsl(var(--admin-yellow-soft))] flex items-center justify-center">
          <QrCode className="h-4 w-4 text-[hsl(42_80%_38%)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">Conectar WhatsApp</h3>
          <p className="text-xs text-[hsl(var(--admin-text-muted))]">Escaneie com seu celular</p>
        </div>
      </div>

      {/* QR area */}
      <div className="w-52 h-52 rounded-xl border-2 border-dashed border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-raised))] flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-[hsl(var(--admin-text-muted))]">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-xs">Gerando QR Code…</span>
          </div>
        ) : qrCode ? (
          <img
            src={qrCode}
            alt="QR Code WhatsApp"
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[hsl(var(--admin-text-muted))] px-4 text-center">
            <QrCode className="h-8 w-8 opacity-30" />
            <span className="text-xs leading-relaxed">
              Nenhum QR Code disponível.<br />Clique em atualizar para gerar.
            </span>
          </div>
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[hsl(var(--admin-border))] bg-white text-[hsl(var(--admin-text-primary))] hover:bg-[hsl(var(--admin-surface-raised))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Atualizar QR Code
      </button>

      {/* Instructions */}
      <p className="text-xs text-[hsl(var(--admin-text-muted))] text-center leading-relaxed">
        WhatsApp &rarr; Dispositivos conectados &rarr; Conectar dispositivo
      </p>
    </div>
  );
}
