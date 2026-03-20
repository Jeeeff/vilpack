/**
 * evolutionWebhookRoutes — rota pública para receber eventos da Evolution API.
 *
 * NÃO usa authMiddleware (JWT). A segurança é feita por EVOLUTION_WEBHOOK_SECRET
 * no header x-webhook-secret ou query param ?secret=.
 *
 * Prefixo montado em: /api/webhooks/evolution
 */
import { Router } from 'express';
import { handleEvolutionWebhook } from '../controllers/evolutionWebhookController.js';

const router = Router();

router.post('/', handleEvolutionWebhook);

export default router;
