import { Router } from 'express';
import { productController } from '../controllers/productController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Leitura pública (usada pelo SmartChat e catálogo)
router.get('/', productController.getAll);
router.get('/:id', productController.getById);

// Escrita protegida
router.post('/', authMiddleware, productController.create);
router.put('/:id', authMiddleware, productController.update);
router.delete('/:id', authMiddleware, productController.delete);

export default router;
