import { Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';
import Stripe from 'stripe';
import { AppError } from '../middlewares/errorHandler';
import { OrderService } from '../services/orderService';

const orderService = new OrderService();

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive()
  })),
  shippingAddress: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string()
  })
});

const updateStatusSchema = z.object({
  status: z.enum([
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED
  ])
});

export class OrderController {
  async create(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const data = createOrderSchema.parse(req.body);

    try {
      const { order, paymentIntent } = await orderService.createOrder({
        userId: req.user.userId,
        storeId: req.params.storeId,
        items: data.items,
        shippingAddress: data.shippingAddress
      });

      return res.status(201).json({
        order,
        clientSecret: paymentIntent.client_secret
      });
    } catch (error: any) {
      if (error.message === 'Store not found') {
        throw new AppError(404, 'Loja não encontrada');
      }
      if (error.message.includes('Produto')) {
        throw new AppError(404, error.message);
      }
      throw error;
    }
  }

  async webhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig || '',
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      await orderService.handleStripeWebhook(event);
      return res.json({ received: true });
    } catch (err) {
      throw new AppError(400, 'Webhook Error');
    }
  }

  async listOrders(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { page = 1, limit = 10, storeId } = req.query;

    try {
      if (storeId) {
        const result = await orderService.getStoreOrders(
          String(storeId),
          Number(page),
          Number(limit)
        );
        return res.json(result);
      } else {
        const result = await orderService.getUserOrders(
          req.user.userId,
          Number(page),
          Number(limit)
        );
        return res.json(result);
      }
    } catch (error: any) {
      if (error.message === 'Store not found') {
        throw new AppError(404, 'Loja não encontrada');
      }
      throw error;
    }
  }

  async getOrder(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;

    try {
      const order = await orderService.getOrder(id, req.user.userId);
      return res.json(order);
    } catch (error: any) {
      if (error.message === 'Order not found') {
        throw new AppError(404, 'Pedido não encontrado');
      }
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Não autorizado a ver este pedido');
      }
      throw error;
    }
  }

  async updateStatus(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;
    const data = updateStatusSchema.parse(req.body);

    try {
      const order = await orderService.updateOrderStatus(
        id,
        req.params.storeId,
        data.status
      );
      return res.json(order);
    } catch (error: any) {
      if (error.message === 'Order not found') {
        throw new AppError(404, 'Pedido não encontrado');
      }
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Não autorizado a atualizar este pedido');
      }
      throw error;
    }
  }
}
