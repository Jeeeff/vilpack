/**
 * QRCodeConnectCard — exibe o QR Code para conexão da instância WhatsApp.
 * O QR Code é recebido via prop (base64 da Evolution API ou via Socket.IO).
 */
import { Button } from '@/components/ui/button';
import { QrCode, RefreshCw } from 'lucide-react';

interface Props {
  qrCode?: string;      // base64 da imagem do QR Code
  loading?: boolean;
  onRefresh?: () => void;
}

export function QRCodeConnectCard({ qrCode, loading, onRefresh }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-lg border bg-white">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-green-600" />
        <h3 className="text-base font-semibold">Conectar WhatsApp</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Gerando QR Code…
        </div>
      ) : qrCode ? (
        <img
          src={qrCode}
          alt="QR Code WhatsApp"
          className="w-48 h-48 rounded border"
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          Nenhum QR Code disponível.<br />Clique em atualizar para gerar.
        </p>
      )}

      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Atualizar QR Code
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
      </p>
    </div>
  );
}
