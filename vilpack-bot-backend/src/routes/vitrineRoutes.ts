/**
 * vitrineRoutes.ts
 *
 * Rotas da Vitrine pública e admin da Vitrine.
 * Registradas em routes/index.ts:
 *   router.use('/vitrine',        vitrinePublicRoutes)   → GET /api/vitrine
 *   router.use('/admin/vitrine',  vitrineAdminRoutes)    → /api/admin/vitrine/*
 */

import { Router } from 'express';
import { vitrineController } from '../controllers/vitrineController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadImage } from '../config/multer';

// ── Public router (no auth) ───────────────────────────────────────────────────

export const vitrinePublicRouter = Router();

/**
 * GET /api/vitrine
 * Produtos publicados na vitrine, consumido pelo site público.
 */
vitrinePublicRouter.get('/', vitrineController.getPublic);

// ── Admin router (auth required) ─────────────────────────────────────────────

export const vitrineAdminRouter = Router();

/**
 * GET /api/admin/vitrine
 * Lista todos os produtos com campos de vitrine para gestão.
 */
vitrineAdminRouter.get('/', authMiddleware, vitrineController.listAll);

/**
 * PATCH /api/admin/vitrine/:id
 * Atualiza campos de vitrine (nome, preço, segmento, tags, toggle publicar).
 */
vitrineAdminRouter.patch('/:id', authMiddleware, vitrineController.update);

/**
 * POST /api/admin/vitrine/:id/image
 * Upload de imagem do produto da vitrine.
 * Nota: rota /image deve vir ANTES de /:id para não conflitar.
 */
vitrineAdminRouter.post(
  '/:id/image',
  authMiddleware,
  uploadImage.single('image'),
  vitrineController.uploadImage,
);

/**
 * DELETE /api/admin/vitrine/:id/image
 * Remove a foto do produto da vitrine.
 */
vitrineAdminRouter.delete('/:id/image', authMiddleware, vitrineController.removeImage);
