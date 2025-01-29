import { Router } from 'express';
import { CouponController } from '../controllers/couponController';
import { authenticate, authorize } from '../middlewares/auth';
import { cache, invalidateCache } from '../middlewares/cache';
import { UserRole } from '@prisma/client';

const router = Router();
const couponController = new CouponController();

// Criar cupom
router.post(
  '/coupons',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['coupons:*']),
  couponController.create
);

// Atualizar cupom
router.put(
  '/coupons/:id',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['coupons:*']),
  couponController.update
);

// Deletar cupom
router.delete(
  '/coupons/:id',
  authenticate,
  authorize(UserRole.VENDOR),
  invalidateCache(['coupons:*']),
  couponController.delete
);

// Listar cupons da loja
router.get(
  '/coupons',
  authenticate,
  authorize(UserRole.VENDOR),
  cache({
    duration: 300,
    key: (req) => `coupons:store:${req.user?.store?.id}`
  }),
  couponController.list
);

// Validar cupom
router.get(
  '/coupons/:code/validate',
  authenticate,
  couponController.validate
);

export default router;
