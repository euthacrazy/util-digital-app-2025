import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { StoreController } from '../controllers/storeController';
import { ProductController } from '../controllers/productController';
import { CategoryController } from '../controllers/categoryController';
import { OrderController } from '../controllers/orderController';
import { GameController } from '../controllers/gameController';
import { authenticate, authorize } from '../middlewares/auth';
import { cache, invalidateCache } from '../middlewares/cache';
import { UserRole } from '@prisma/client';
import couponRoutes from './couponRoutes';
import uploadRoutes from './uploadRoutes';

const router = Router();
const authController = new AuthController();
const storeController = new StoreController();
const productController = new ProductController();
const categoryController = new CategoryController();
const orderController = new OrderController();
const gameController = new GameController();

// Rotas de autenticação
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, cache({ duration: 300 }), authController.me);

// Rotas de lojas
router.post(
  '/stores',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['stores:*']),
  storeController.create
);
router.put(
  '/stores/:id',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['stores:*', 'store:*']),
  storeController.update
);
router.get(
  '/stores/my-store',
  authenticate,
  authorize(UserRole.VENDOR),
  cache({ duration: 300 }),
  storeController.getMyStore
);
router.get(
  '/stores/:id',
  cache({ duration: 600 }),
  storeController.getStore
);
router.get(
  '/stores',
  cache({
    duration: 300,
    key: (req) => `stores:${req.query.page || 1}:${req.query.limit || 10}`
  }),
  storeController.listStores
);
router.delete(
  '/stores/:id',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['stores:*', 'store:*']),
  storeController.delete
);

// Rotas de produtos
router.post(
  '/products',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['products:*', 'stores:*']),
  productController.create
);
router.put(
  '/products/:id',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['products:*', 'product:*', 'stores:*']),
  productController.update
);
router.get(
  '/products/:id',
  cache({ duration: 600 }),
  productController.getProduct
);
router.get(
  '/products',
  cache({
    duration: 300,
    key: (req) => `products:${JSON.stringify(req.query)}`
  }),
  productController.listProducts
);
router.delete(
  '/products/:id',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['products:*', 'product:*', 'stores:*']),
  productController.delete
);

// Rotas de categorias
router.post(
  '/categories',
  authenticate,
  authorize(UserRole.ADMIN),
  invalidateCache(['categories:*']),
  categoryController.create
);
router.put(
  '/categories/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  invalidateCache(['categories:*', 'category:*']),
  categoryController.update
);
router.get(
  '/categories/:id',
  cache({ duration: 3600 }),
  categoryController.getCategory
);
router.get(
  '/categories',
  cache({ duration: 3600 }),
  categoryController.listCategories
);
router.delete(
  '/categories/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  invalidateCache(['categories:*', 'category:*']),
  categoryController.delete
);

// Rotas de pedidos
router.post('/orders', authenticate, orderController.create);
router.get(
  '/orders',
  authenticate,
  cache({
    duration: 60,
    key: (req) => `orders:${req.user?.userId}:${req.query.page || 1}`
  }),
  orderController.listOrders
);
router.get(
  '/orders/:id',
  authenticate,
  cache({ duration: 60 }),
  orderController.getOrder
);
router.put(
  '/orders/:id/status',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['orders:*']),
  orderController.updateStatus
);
router.post('/webhook/stripe', orderController.webhook);

// Rotas de cupons
router.use(couponRoutes);

// Rotas de upload
router.use(uploadRoutes);

// Rotas de gamificação
router.post('/game/play', authenticate, gameController.playDaily);
router.get(
  '/game/leaderboard',
  cache({ duration: 300 }),
  gameController.getLeaderboard
);
router.get(
  '/game/referrals',
  authenticate,
  cache({ duration: 300 }),
  gameController.getReferralStats
);
router.get(
  '/game/achievements',
  authenticate,
  cache({ duration: 300 }),
  gameController.getAchievements
);

export { router as routes };
