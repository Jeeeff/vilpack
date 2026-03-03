import { Router } from 'express';
import { cartController } from '../controllers/cartController';

const router = Router();

router.get('/:sessionId', cartController.getCart);
router.post('/item', cartController.addItem);
router.put('/item', cartController.updateItem);
router.delete('/item/:itemId', cartController.removeItem);
router.delete('/:sessionId', cartController.clearCart);
router.post('/checkout', cartController.checkout);
router.post('/reorder/:orderId', cartController.reorder);

export default router;
