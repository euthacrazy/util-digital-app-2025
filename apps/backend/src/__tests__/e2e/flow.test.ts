import request from 'supertest';
import app from '../../index';
import { prismaMock } from '../setup';

describe('E2E Flow Tests', () => {
  let userToken: string;
  let storeId: string;
  let productId: string;
  let orderId: string;

  describe('Complete User Journey', () => {
    it('should register a new user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        referralCode: 'REF123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockWallet = {
        id: '1',
        userId: '1',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.create.mockResolvedValue(mockUser);
      prismaMock.wallet.create.mockResolvedValue(mockWallet);

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      userToken = response.body.token;
    });

    it('should create a store', async () => {
      const mockStore = {
        id: '1',
        name: 'Test Store',
        description: 'Test Description',
        logo: 'https://example.com/logo.jpg',
        banner: 'https://example.com/banner.jpg',
        ownerId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.create.mockResolvedValue(mockStore);

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Store',
          description: 'Test Description',
          logo: 'base64logo',
          banner: 'base64banner'
        });

      expect(response.status).toBe(201);
      storeId = response.body.id;
    });

    it('should create a product', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        images: ['https://example.com/image.jpg'],
        storeId,
        categoryId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.findUnique.mockResolvedValue({
        id: storeId,
        ownerId: '1',
        name: 'Test Store',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.product.create.mockResolvedValue(mockProduct);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Product',
          description: 'Test Description',
          price: 100,
          images: ['base64image'],
          categoryId: '1',
          storeId
        });

      expect(response.status).toBe(201);
      productId = response.body.id;
    });

    it('should create an order', async () => {
      const mockProduct = {
        id: productId,
        price: 100,
        storeId,
        name: 'Test Product',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockOrder = {
        id: '1',
        userId: '1',
        storeId,
        total: 100,
        status: 'PENDING',
        items: [
          {
            id: '1',
            productId,
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
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              productId,
              quantity: 1
            }
          ],
          shippingAddress: {
            street: 'Test Street',
            city: 'Test City'
          }
        });

      expect(response.status).toBe(201);
      orderId = response.body.order.id;
    });

    it('should process payment webhook', async () => {
      const mockOrder = {
        id: orderId,
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

    it('should update order status', async () => {
      const mockOrder = {
        id: orderId,
        userId: '1',
        storeId,
        status: 'PROCESSING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'PAID'
      });

      prismaMock.store.findUnique.mockResolvedValue({
        id: storeId,
        ownerId: '1',
        name: 'Test Store',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.order.update.mockResolvedValue(mockOrder);

      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'PROCESSING'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PROCESSING');
    });

    it('should get order details', async () => {
      const mockOrder = {
        id: orderId,
        userId: '1',
        storeId,
        total: 100,
        status: 'PROCESSING',
        items: [
          {
            id: '1',
            productId,
            quantity: 1,
            price: 100,
            product: {
              id: productId,
              name: 'Test Product'
            }
          }
        ],
        user: {
          id: '1',
          name: 'Test User'
        },
        store: {
          id: storeId,
          name: 'Test Store'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        total: 100,
        status: 'PROCESSING',
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
  });
});
