import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';

const prisma = new PrismaClient();

export class CouponController {
  async create(req: Request, res: Response) {
    const { code, discount, maxUses, expiresAt } = req.body;
    const storeId = req.user?.store?.id;

    if (!storeId) {
      throw new AppError(403, 'Acesso permitido apenas para vendedores');
    }

    const existingCoupon = await prisma.coupon.findUnique({
      where: { code }
    });

    if (existingCoupon) {
      throw new AppError(400, 'Código de cupom já existe');
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discount,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        storeId
      }
    });

    return res.status(201).json(coupon);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { discount, maxUses, expiresAt, active } = req.body;
    const storeId = req.user?.store?.id;

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      throw new AppError(404, 'Cupom não encontrado');
    }

    if (coupon.storeId !== storeId) {
      throw new AppError(403, 'Não autorizado');
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: {
        discount,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active
      }
    });

    return res.json(updatedCoupon);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const storeId = req.user?.store?.id;

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      throw new AppError(404, 'Cupom não encontrado');
    }

    if (coupon.storeId !== storeId) {
      throw new AppError(403, 'Não autorizado');
    }

    await prisma.coupon.delete({
      where: { id }
    });

    return res.status(204).send();
  }

  async list(req: Request, res: Response) {
    const storeId = req.user?.store?.id;

    if (!storeId) {
      throw new AppError(403, 'Acesso permitido apenas para vendedores');
    }

    const coupons = await prisma.coupon.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(coupons);
  }

  async validate(req: Request, res: Response) {
    const { code } = req.params;
    const { storeId } = req.query;

    const coupon = await prisma.coupon.findUnique({
      where: { code }
    });

    if (!coupon) {
      throw new AppError(404, 'Cupom não encontrado');
    }

    if (!coupon.active) {
      throw new AppError(400, 'Cupom inativo');
    }

    if (coupon.storeId !== storeId) {
      throw new AppError(400, 'Cupom não válido para esta loja');
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError(400, 'Cupom expirado');
    }

    if (coupon.usedCount >= coupon.maxUses) {
      throw new AppError(400, 'Cupom esgotado');
    }

    return res.json({
      valid: true,
      discount: coupon.discount
    });
  }
}
