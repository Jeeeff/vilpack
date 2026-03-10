import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Auth
router.post('/login', adminController.login);

// Leads Management (Protected)
router.get('/leads', authMiddleware, adminController.listLeads);
router.get('/leads/:id', authMiddleware, adminController.getLead);
router.patch('/leads/:id/status', authMiddleware, adminController.updateStatus);
router.patch('/leads/:id/priority', authMiddleware, adminController.updatePriority);
router.patch('/leads/:id/notes', authMiddleware, adminController.updateNotes);

export default router;
