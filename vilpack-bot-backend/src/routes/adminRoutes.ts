import { Router } from 'express';
import { login, getOrders, getOrderChat } from '../controllers/adminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import multer from 'multer';
import path from 'path';
import { updateProductImage } from '../controllers/productController';

const router = Router();

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/products');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Public Routes
router.post('/login', login);

// Protected Routes
router.use(authMiddleware);

router.get('/orders', getOrders);
router.get('/orders/:id/chat', getOrderChat);

router.post('/products/:id/image', upload.single('image'), updateProductImage);

export default router;
