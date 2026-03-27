import { Router } from 'express';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import cartRoutes from './cartRoutes';
import aiRoutes from './aiRoutes';
import sessionRoutes from './sessionRoutes';
import orderRoutes from './orderRoutes';
import adminRoutes from './adminRoutes';
import adminWhatsappRoutes from './adminWhatsappRoutes';
import evolutionWebhookRoutes from './evolutionWebhookRoutes';
import { vitrinePublicRouter, vitrineAdminRouter } from './vitrineRoutes';

const router = Router();

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/ai', aiRoutes);
router.use('/session', sessionRoutes);
router.use('/order', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/whatsapp', adminWhatsappRoutes);
router.use('/webhooks/evolution', evolutionWebhookRoutes);

// Vitrine — site público + gestão admin
router.use('/vitrine', vitrinePublicRouter);
router.use('/admin/vitrine', vitrineAdminRouter);

export default router;
