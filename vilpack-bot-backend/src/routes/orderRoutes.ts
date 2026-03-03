import { Router } from 'express';
import { orderController } from '../controllers/orderController';

const router = Router();

// Rota para criar um rascunho de pedido (Lead Capture)
router.post('/draft', orderController.createDraft);

export default router;
