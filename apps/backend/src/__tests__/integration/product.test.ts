import request from 'supertest';
import app from '../../index';
import { prismaMock } from '../setup';
import jwt from 'jsonwebtoken';

describe('Product Integration Tests', () => {
  const token = jwt.sign({ userId: '1' }, process.env.JWT_SECRET || 'test-secret');

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        images: ['https://example.com/image.jpg'],
        storeId: '1',
        categoryId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        ownerId: '1',
        name: 'Test Store',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.product.create.mockResolvedValue(mockProduct);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product',
          description: 'Test Description',
          price: 100,
          images: ['base64image'],
          categoryId: '1',
          storeId: '1'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Test Product',
        description: 'Test Description',
        price: 100
      });
    });

    it('should return 404 if store not found', async () => {
      prismaMock.store.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product',
          description: 'Test Description',
          price: 100,
          images: ['base64image'],
          categoryId: '1',
          storeId: '1'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Loja não encontrada');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product details', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        images: ['https://example.com/image.jpg'],
        store: {
          id: '1',
          name: 'Test Store'
        },
        category: {
          id: '1',
          name: 'Test Category'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      const response = await request(app)
        .get('/api/products/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        store: {
          name: 'Test Store'
        },
        category: {
          name: 'Test Category'
        }
      });
    });

    it('should return 404 if product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/products/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Produto não encontrado');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product details', async () => {
      const mockProduct = {
        id: '1',
        name: 'Updated Product',
        description: 'Updated Description',
        price: 200,
        storeId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.product.findUnique.mockResolvedValue({
        ...mockProduct,
        name: 'Old Product'
      });

      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        ownerId: '1',
        name: 'Test Store',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.product.update.mockResolvedValue(mockProduct);

      const response = await request(app)
        .put('/api/products/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Product',
          description: 'Updated Description',
          price: 200
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Updated Product',
        description: 'Updated Description',
        price: 200
      });
    });

    it('should return 403 if user is not the store owner', async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: '1',
        name: 'Product',
        storeId: '1',
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
        .put('/api/products/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Product'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Não autorizado');
    });
  });

  describe('GET /api/products', () => {
    it('should return list of products with pagination', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          price: 100
        },
        {
          id: '2',
          name: 'Product 2',
          price: 200
        }
      ];

      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.product.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(2);
      expect(response.body).toMatchObject({
        items: mockProducts,
        total: 2,
        page: 1,
        limit: 10
      });
    });
  });
});
