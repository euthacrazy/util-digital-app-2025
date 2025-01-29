import request from 'supertest';
import app from '../../index';
import { prismaMock } from '../setup';
import jwt from 'jsonwebtoken';

describe('Order Integration Tests', () => {
  const token = jwt.sign({ userId: '1' }, process.env.JWT_SECRET || 'test-secret');

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const mockProduct = {
        id: '1',
        price: 100,
        storeId: '1',
        name: 'Test Product',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockOrder = {
        id: '1',
        userId: '1',
        storeId: '1',
        total: 100,
        status: 'PENDING',
        items: [
          {
            id: '1',
            productId: '1',
            quantity: 1,
            price: 100
          }
        ],
        paymentIntentId: 'pi_123',
        shippingAddress: {
          street: 'Test Street',
          city: 'Test City'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.order.create.mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
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

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('order');
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body.order).toMatchObject({
        total: 100,
        status: 'PENDING'
      });
    });

    it('should return 404 if product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
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

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Produto não encontrado');
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order details', async () => {
      const mockOrder = {
        id: '1',
        userId: '1',
        storeId: '1',
        total: 100,
        status: 'PENDING',
        items: [
          {
            id: '1',
            productId: '1',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      const response = await request(app)
        .get('/api/orders/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total: 100,
        status: 'PENDING',
        items: [
          {
            quantity: 1,
            price: 100,
            product: {
              name: 'Test Product'
            }
          }
        ]
      });
    });

    it('should return 404 if order not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/orders/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Pedido não encontrado');
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status', async () => {
      const mockOrder = {
        id: '1',
        userId: '1',
        storeId: '1',
        status: 'PROCESSING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'PENDING'
      });

      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        ownerId: '1',
        name: 'Test Store',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.order.update.mockResolvedValue(mockOrder);

      const response = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'PROCESSING'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'PROCESSING'
      });
    });

    it('should return 403 if user is not the store owner', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: '1',
        storeId: '1',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        ownerId: '2',
        name: 'Test Store',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'PROCESSING'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Não autorizado');
    });
  });

  describe('POST /api/orders/webhook', () => {
    it('should handle Stripe webhook', async () => {
      const mockOrder = {
        id: '1',
        status: 'PAID',
        paymentIntentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: 'PENDING'
      });

      prismaMock.order.update.mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/api/orders/webhook')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_123'
            }
          }
        });

      expect(response.status).toBe(200);
    });
  });
});
