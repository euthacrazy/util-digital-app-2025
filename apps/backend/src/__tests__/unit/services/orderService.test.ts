import { OrderService } from '../../../services/orderService';
import { prismaMock } from '../../setup';
import Stripe from 'stripe';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_123'
      })
    }
  }));
});

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService();
  });

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const mockOrder = {
        id: '1',
        userId: 'user123',
        storeId: 'store123',
        status: 'PENDING' as const,
        total: 100,
        items: [
          {
            productId: 'product123',
            quantity: 1,
            price: 100
          }
        ],
        shippingAddress: {
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        },
        stripeSessionId: 'sess_123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.product.findUnique.mockResolvedValue({
        id: '1',
        price: 100,
        storeId: '1',
        name: 'Test Product',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.order.create.mockResolvedValue(mockOrder);

      const result = await orderService.createOrder('1', {
        items: [
          {
            productId: '1',
            quantity: 1
          }
        ],
        shippingAddress: {
          street: 'Test Street',
          city: 'Test City'
        }
      });

      expect(prismaMock.order.create).toHaveBeenCalled();
      expect(result).toEqual({
        order: mockOrder,
        clientSecret: 'secret_123'
      });
    });

    it('should throw error if product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        orderService.createOrder('1', {
          items: [
            {
              productId: '1',
              quantity: 1
            }
          ],
          shippingAddress: {
            street: 'Test Street',
            city: 'Test City'
          }
        })
      ).rejects.toThrow('Produto não encontrado');
    });
  });

  describe('getOrder', () => {
    it('should return order details', async () => {
      const mockOrder = {
        id: '1',
        userId: 'user123',
        storeId: 'store123',
        status: 'PENDING' as const,
        total: 100,
        items: [
          {
            id: '1',
            productId: 'product123',
            quantity: 1,
            price: 100,
            product: {
              id: '1',
              name: 'Test Product'
            }
          }
        ],
        user: {
          id: '1',
          name: 'Test User'
        },
        store: {
          id: '1',
          name: 'Test Store'
        },
        shippingAddress: {
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        },
        stripeSessionId: 'sess_123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      const result = await orderService.getOrder('1', '1');

      expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: true,
          store: true
        }
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw error if order not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(orderService.getOrder('1', '1')).rejects.toThrow('Pedido não encontrado');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const mockOrder = {
        id: '1',
        userId: 'user123',
        storeId: 'store123',
        status: 'PROCESSING' as const,
        total: 100,
        items: [
          {
            productId: 'product123',
            quantity: 1,
            price: 100
          }
        ],
        shippingAddress: {
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        },
        stripeSessionId: 'sess_123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'PENDING'
      });

      prismaMock.order.update.mockResolvedValue(mockOrder);

      const result = await orderService.updateOrderStatus('1', '1', 'PROCESSING');

      expect(prismaMock.order.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'PROCESSING' }
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw error if order not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus('1', '1', 'PROCESSING')
      ).rejects.toThrow('Pedido não encontrado');
    });
  });

  describe('handleWebhook', () => {
    it('should handle successful payment', async () => {
      const mockOrder = {
        id: '1',
        userId: 'user123',
        storeId: 'store123',
        status: 'PAID' as const,
        total: 100,
        items: [
          {
            productId: 'product123',
            quantity: 1,
            price: 100
          }
        ],
        shippingAddress: {
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        },
        stripeSessionId: 'sess_123',
        paymentIntentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: 'PENDING'
      });

      prismaMock.order.update.mockResolvedValue(mockOrder);

      await orderService.handleWebhook({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123'
          }
        }
      } as Stripe.Event);

      expect(prismaMock.order.update).toHaveBeenCalledWith({
        where: { paymentIntentId: 'pi_123' },
        data: { status: 'PAID' }
      });
    });

    it('should handle failed payment', async () => {
      const mockOrder = {
        id: '1',
        userId: 'user123',
        storeId: 'store123',
        status: 'FAILED' as const,
        total: 100,
        items: [
          {
            productId: 'product123',
            quantity: 1,
            price: 100
          }
        ],
        shippingAddress: {
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678'
        },
        stripeSessionId: 'sess_123',
        paymentIntentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: 'PENDING'
      });

      prismaMock.order.update.mockResolvedValue(mockOrder);

      await orderService.handleWebhook({
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_123'
          }
        }
      } as Stripe.Event);

      expect(prismaMock.order.update).toHaveBeenCalledWith({
        where: { paymentIntentId: 'pi_123' },
        data: { status: 'FAILED' }
      });
    });
  });
});
