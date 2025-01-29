import { PrismaClient, Order, OrderStatus } from '@prisma/client';
import Stripe from 'stripe';
import { AppError } from '../middlewares/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class OrderService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createOrder(data: {
    userId: string;
    storeId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    shippingAddress: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  }): Promise<{
    order: Order;
    paymentIntent: Stripe.PaymentIntent;
  }> {
    // Buscar produtos e calcular total
    const products = await Promise.all(
      data.items.map(async item => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new AppError(404, `Produto ${item.productId} não encontrado`);
        }
        return {
          ...product,
          quantity: item.quantity,
        };
      })
    );

    const total = products.reduce(
      (acc, product) => acc + product.price * product.quantity,
      0
    );

    // Criar pedido
    const order = await this.prisma.order.create({
      data: {
        userId: data.userId,
        storeId: data.storeId,
        total,
        status: OrderStatus.PENDING,
        shippingAddress: data.shippingAddress,
        items: {
          create: products.map(product => ({
            productId: product.id,
            quantity: product.quantity,
            price: product.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Criar PaymentIntent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Stripe trabalha com centavos
      currency: 'brl',
      metadata: {
        orderId: order.id,
        storeId: data.storeId,
      },
    });

    // Atualizar pedido com ID do PaymentIntent
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentIntentId: paymentIntent.id,
      },
    });

    return { order, paymentIntent };
  }

  async getOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
      },
    });

    if (!order) {
      throw new AppError(404, 'Pedido não encontrado');
    }

    if (order.userId !== userId && order.store.ownerId !== userId) {
      throw new AppError(403, 'Não autorizado a ver este pedido');
    }

    return order;
  }

  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: Order[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          store: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.count({
        where: { userId },
      }),
    ]);

    return {
      orders,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getStoreOrders(
    storeId: string,
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus
  ): Promise<{
    orders: Order[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const where = {
      storeId,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async updateOrderStatus(
    orderId: string,
    storeId: string,
    status: OrderStatus
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'Pedido não encontrado');
    }

    if (order.storeId !== storeId) {
      throw new AppError(403, 'Não autorizado a atualizar este pedido');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAID },
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.FAILED },
        });
        break;
      }
    }
  }
}
