import request from 'supertest';
import app from '../../index';
import { prismaMock } from '../setup';
import jwt from 'jsonwebtoken';

describe('Auth Integration Tests', () => {
  describe('POST /api/users/register', () => {
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
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User'
      });
    });

    it('should return 400 if email is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        referralCode: 'REF123',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email já está em uso');
    });
  });

  describe('POST /api/users/login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        referralCode: 'REF123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User'
      });
    });

    it('should return 401 if credentials are invalid', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Email ou senha inválidos');
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        wallet: {
          balance: 100
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const token = jwt.sign({ userId: '1' }, process.env.JWT_SECRET || 'test-secret');

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        wallet: {
          balance: 100
        }
      });
    });

    it('should return 401 if token is invalid', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });
  });
});
