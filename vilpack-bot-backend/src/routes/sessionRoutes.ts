import { Router } from 'express';
import { sessionController } from '../controllers/sessionController';

const router = Router();

router.post('/', sessionController.createSession);
router.get('/:id', sessionController.getSession);

export default router;
