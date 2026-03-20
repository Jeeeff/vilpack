/**
 * adminWhatsappRoutes — rotas protegidas do módulo WhatsApp no painel admin.
 * Todas as rotas requerem JWT via authMiddleware.
 *
 * Prefixo montado em: /api/admin/whatsapp
 */
import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as ctrl from '../controllers/adminWhatsappController.js';

const router = Router();

// Aplica auth em todas as rotas deste módulo
router.use(authMiddleware);

// ─── instância / QR Code ─────────────────────────────────────────────────────
router.get('/instance/status',   ctrl.getInstanceStatus);
router.get('/instance/qrcode',   ctrl.getQRCode);
router.post('/instance/create',  ctrl.createInstance);
router.post('/instance/webhook', ctrl.setWebhook);

// ─── conversas ───────────────────────────────────────────────────────────────
router.get('/conversations',            ctrl.listConversations);
router.get('/conversations/:id',        ctrl.getConversation);
router.patch('/conversations/:id',      ctrl.updateConversation);
router.post('/conversations/:id/read',  ctrl.markConversationAsRead);

// ─── mensagens ────────────────────────────────────────────────────────────────
router.get('/conversations/:id/messages', ctrl.listMessages);
router.post('/messages/send',             ctrl.sendMessage);

// ─── takeover ─────────────────────────────────────────────────────────────────
router.post('/handoff/takeover', ctrl.takeOver);
router.post('/handoff/release',  ctrl.releaseToBot);

export default router;
