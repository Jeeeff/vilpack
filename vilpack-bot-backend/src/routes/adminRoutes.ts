import { Router } from 'express';
import { adminController } from '../controllers/adminController';

const router = Router();

// Leads Management
router.get('/leads', adminController.listLeads);
router.get('/leads/:id', adminController.getLead);
router.patch('/leads/:id/status', adminController.updateStatus);
router.patch('/leads/:id/notes', adminController.updateNotes);

export default router;
