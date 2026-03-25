/**
 * vitrineController.ts
 *
 * Gerencia a vitrine pública ("Nossos Produtos") separadamente do catálogo
 * interno. Rotas admin (protegidas) + rota pública de leitura.
 *
 * Endpoints admin (requerem JWT via authMiddleware):
 *   GET    /api/admin/vitrine              — lista todos os produtos (com flag showInVitrine)
 *   PATCH  /api/admin/vitrine/:id          — edita campos da vitrine (nome, preço, segmento, tags, ordem, toggle)
 *   POST   /api/admin/vitrine/:id/image    — upload/troca de foto (multer uploadImage)
 *   DELETE /api/admin/vitrine/:id/image    — remove foto do produto
 *
 * Endpoint público (sem auth):
 *   GET    /api/vitrine                    — produtos com showInVitrine = true, ordenados por vitrineOrder
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../config/prisma';

// ── helpers ────────────────────────────────────────────────────────────────────

const getSingleValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

/** Builds the public-facing image URL stored in the DB (e.g. "/uploads/products/xxx.jpg") */
function buildImageUrl(filename: string): string {
  return `/uploads/products/${filename}`;
}

/** Deletes an uploaded image file from disk (best-effort, no throw) */
function deleteImageFile(imageUrl: string | null): void {
  if (!imageUrl) return;
  try {
    const filename = path.basename(imageUrl);
    const filePath = path.join(__dirname, '../../public/uploads/products', filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best-effort — do not crash the request
  }
}

// ── controller ─────────────────────────────────────────────────────────────────

export const vitrineController = {

  // ── Public ──────────────────────────────────────────────────────────────────

  /**
   * GET /api/vitrine
   * Retorna produtos publicados na vitrine, ordenados por vitrineOrder ASC.
   * Sem autenticação — consumido pelo site público.
   */
  async getPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await prisma.product.findMany({
        where: { showInVitrine: true, active: true },
        orderBy: [{ vitrineOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          vitrineSegment: true,
          vitrineTags: true,
        },
      });

      // Parse vitrineTags string → string[] for the frontend
      const mapped = products.map((p) => ({
        ...p,
        price: p.price.toString(),
        tags: p.vitrineTags
          ? p.vitrineTags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        segment: p.vitrineSegment ?? 'Geral',
      }));

      res.json(mapped);
    } catch (error) {
      next(error);
    }
  },

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/admin/vitrine
   * Lista TODOS os produtos do catálogo com seus campos de vitrine.
   * Permite ao admin ver o catálogo inteiro e decidir o que publicar.
   */
  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await prisma.product.findMany({
        orderBy: [
          { showInVitrine: 'desc' }, // publicados primeiro
          { vitrineOrder: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          active: true,
          showInVitrine: true,
          vitrineSegment: true,
          vitrineTags: true,
          vitrineOrder: true,
          category: { select: { id: true, name: true } },
        },
      });

      const mapped = products.map((p) => ({
        ...p,
        price: p.price.toString(),
      }));

      res.json(mapped);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/vitrine/:id
   * Atualiza campos de vitrine de um produto.
   * Aceita qualquer subconjunto de: name, description, price, showInVitrine,
   * vitrineSegment, vitrineTags, vitrineOrder.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID do produto é obrigatório' });
        return;
      }

      const {
        name,
        description,
        price,
        showInVitrine,
        vitrineSegment,
        vitrineTags,
        vitrineOrder,
      } = req.body;

      const data: Record<string, unknown> = {};

      if (name !== undefined)           data.name           = String(name).trim();
      if (description !== undefined)    data.description    = description || null;
      if (price !== undefined)          data.price          = parseFloat(price);
      if (showInVitrine !== undefined)  data.showInVitrine  = Boolean(showInVitrine);
      if (vitrineSegment !== undefined) data.vitrineSegment = vitrineSegment || null;
      if (vitrineTags !== undefined)    data.vitrineTags    = vitrineTags || null;
      if (vitrineOrder !== undefined)   data.vitrineOrder   = parseInt(vitrineOrder, 10) || 0;

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: 'Nenhum campo enviado para atualizar' });
        return;
      }

      const updated = await prisma.product.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          active: true,
          showInVitrine: true,
          vitrineSegment: true,
          vitrineTags: true,
          vitrineOrder: true,
          category: { select: { id: true, name: true } },
        },
      });

      res.json({ ...updated, price: updated.price.toString() });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/vitrine/:id/image
   * Faz upload de uma imagem para o produto.
   * Remove a imagem anterior do disco se existir.
   * Usa o mesmo multer (uploadImage) já configurado.
   */
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID do produto é obrigatório' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Nenhuma imagem enviada' });
        return;
      }

      // Fetch current imageUrl to delete old file
      const current = await prisma.product.findUnique({
        where: { id },
        select: { imageUrl: true },
      });
      deleteImageFile(current?.imageUrl ?? null);

      const imageUrl = buildImageUrl(req.file.filename);

      const updated = await prisma.product.update({
        where: { id },
        data: { imageUrl },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          showInVitrine: true,
          vitrineSegment: true,
          vitrineTags: true,
          vitrineOrder: true,
          price: true,
        },
      });

      res.json({ ...updated, price: updated.price.toString() });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/vitrine/:id/image
   * Remove a foto do produto (disco + DB).
   */
  async removeImage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getSingleValue(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID do produto é obrigatório' });
        return;
      }

      const current = await prisma.product.findUnique({
        where: { id },
        select: { imageUrl: true },
      });
      deleteImageFile(current?.imageUrl ?? null);

      await prisma.product.update({
        where: { id },
        data: { imageUrl: null },
      });

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
};
