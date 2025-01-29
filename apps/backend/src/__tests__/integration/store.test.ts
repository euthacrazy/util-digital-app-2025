import request from 'supertest';
import app from '../../index';
import { prismaMock } from '../setup';
import jwt from 'jsonwebtoken';

describe('Store Integration Tests', () => {
  const token = jwt.sign({ userId: '1' }, process.env.JWT_SECRET || 'test-secret');

  describe('POST /api/stores', () => {
    it('should create a new store', async () => {
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
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Store',
          description: 'Test Description',
          logo: 'base64logo',
          banner: 'base64banner'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Test Store',
        description: 'Test Description'
      });
    });

    it('should return 400 if user already has a store', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        name: 'Existing Store',
        ownerId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Store'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Usuário já possui uma loja');
    });
  });

  describe('GET /api/stores/:id', () => {
    it('should return store details', async () => {
      const mockStore = {
        id: '1',
        name: 'Test Store',
        description: 'Test Description',
        products: [
          {
            id: '1',
            name: 'Product 1',
            price: 100
          }
        ],
        owner: {
          id: '1',
          name: 'Test User'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.findUnique.mockResolvedValue(mockStore);

      const response = await request(app)
        .get('/api/stores/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Test Store',
        description: 'Test Description',
        products: [
          {
            name: 'Product 1',
            price: 100
          }
        ]
      });
    });

    it('should return 404 if store not found', async () => {
      prismaMock.store.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/stores/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Loja não encontrada');
    });
  });

  describe('PUT /api/stores/:id', () => {
    it('should update store details', async () => {
      const mockStore = {
        id: '1',
        name: 'Updated Store',
        description: 'Updated Description',
        ownerId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.findUnique.mockResolvedValue({
        ...mockStore,
        name: 'Old Store'
      });

      prismaMock.store.update.mockResolvedValue(mockStore);

      const response = await request(app)
        .put('/api/stores/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Store',
          description: 'Updated Description'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Updated Store',
        description: 'Updated Description'
      });
    });

    it('should return 403 if user is not the owner', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        name: 'Store',
        ownerId: '2',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .put('/api/stores/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Store'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Não autorizado');
    });
  });
});
