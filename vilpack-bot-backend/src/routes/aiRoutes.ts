import { Router } from 'express';
import { aiController } from '../controllers/aiController';

const router = Router();

router.post('/chat', aiController.chat);
router.get('/history/:sessionId', aiController.history);

export default router;
