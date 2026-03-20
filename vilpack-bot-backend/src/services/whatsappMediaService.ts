/**
 * whatsappMediaService — abstração de storage de mídia.
 * Suporta driver 'local' e 's3' via WHATSAPP_MEDIA_STORAGE_DRIVER.
 * O banco armazena apenas metadados (storageKey). URLs são geradas sob demanda.
 */
import prisma from '../config/prisma.js';
import path from 'path';
import fs from 'fs';
import { featureFlags } from '../config/featureFlags.js';

const DRIVER = process.env.WHATSAPP_MEDIA_STORAGE_DRIVER ?? 'local';
const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

export const whatsappMediaService = {
  /** Salva buffer de mídia e persiste metadados no banco */
  async saveMedia(messageId: string, opts: {
    buffer: Buffer;
    type: string;
    mimeType: string;
    fileName?: string;
  }) {
    if (!featureFlags.ENABLE_WHATSAPP_MEDIA) return null;

    let storageKey: string;
    let url: string | undefined;

    if (DRIVER === 's3') {
      // Placeholder — integração S3 será implementada na Etapa 5
      storageKey = `whatsapp/${Date.now()}-${opts.fileName ?? 'file'}`;
      url = undefined;
    } else {
      // Driver local
      ensureLocalDir();
      const ext  = path.extname(opts.fileName ?? `.${opts.type}`);
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      storageKey = name;
      fs.writeFileSync(path.join(LOCAL_DIR, name), opts.buffer);
      url = `/uploads/whatsapp/${name}`;
    }

    return prisma.whatsappAttachment.create({
      data: {
        messageId,
        type: opts.type,
        mimeType: opts.mimeType,
        fileName: opts.fileName,
        fileSize: opts.buffer.length,
        storageKey,
        url,
      },
    });
  },

  /** Retorna URL de acesso ao arquivo */
  getUrl(storageKey: string): string {
    if (DRIVER === 's3') {
      const endpoint = process.env.S3_ENDPOINT ?? '';
      const bucket   = process.env.S3_BUCKET ?? '';
      return `${endpoint}/${bucket}/${storageKey}`;
    }
    return `/uploads/whatsapp/${storageKey}`;
  },
};
