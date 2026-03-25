import { Router } from 'express';
import prisma from '../config/prisma';
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

router.get('/force-migrate', async (req, res) => {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerName" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderSummary" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'draft';`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN "total" SET DEFAULT 0.00;`);
        res.send('Migration executed');
    } catch (e) {
        res.status(500).json(e);
    }
});

export default router;
