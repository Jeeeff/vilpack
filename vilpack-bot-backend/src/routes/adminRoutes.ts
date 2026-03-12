import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { productController } from '../controllers/productController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadImage, uploadCsv } from '../config/multer';

const router = Router();

// Auth
router.post('/login', adminController.login);

// Leads Management (Protected)
router.get('/leads', authMiddleware, adminController.listLeads);
router.get('/leads/:id', authMiddleware, adminController.getLead);
router.patch('/leads/:id/status', authMiddleware, adminController.updateStatus);
router.patch('/leads/:id/priority', authMiddleware, adminController.updatePriority);
router.patch('/leads/:id/notes', authMiddleware, adminController.updateNotes);

// Product Management (Protected)
// Importar CSV de produtos — deve vir ANTES de /:id para não conflitar
router.post('/products/import-csv', authMiddleware, uploadCsv.single('file'), productController.importCsv);
// Upload de imagem de produto
router.post('/products/:id/image', authMiddleware, uploadImage.single('image'), productController.updateProductImage);

export default router;
