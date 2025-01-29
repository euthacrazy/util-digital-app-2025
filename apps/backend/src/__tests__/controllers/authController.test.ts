import { Request, Response } from 'express';
import { AuthController } from '../../controllers/authController';
import { prismaMock } from '../setup';
import { UserRole } from '@prisma/client';

interface CustomRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

describe('AuthController', () => {
  let authController: AuthController;
  let req: Partial<CustomRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    authController = new AuthController();
    req = {
      body: {},
      user: undefined
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.CUSTOMER
      };

      req.body = userData;

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        email: userData.email,
        password: 'hashed_password',
        name: userData.name,
        role: userData.role,
        utilCoins: 0,
        referralCode: 'ABC123',
        referredBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await authController.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            email: userData.email,
            name: userData.name,
            role: userData.role
          }),
          token: expect.any(String)
        })
      );
    });

    it('should not allow duplicate emails', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.CUSTOMER
      };

      req.body = userData;

      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: userData.email,
        password: 'hashed_password',
        name: userData.name,
        role: userData.role,
        utilCoins: 0,
        referralCode: 'ABC123',
        referredBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(
        authController.register(req as Request, res as Response)
      ).rejects.toThrow('Email já cadastrado');
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      req.body = loginData;

      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginData.email,
        password: '$2a$10$hashed_password',
        name: 'Test User',
        role: UserRole.CUSTOMER,
        utilCoins: 0,
        referralCode: 'ABC123',
        referredBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await authController.login(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            email: loginData.email
          }),
          token: expect.any(String)
        })
      );
    });

    it('should fail with incorrect credentials', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };

      req.body = loginData;

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authController.login(req as Request, res as Response)
      ).rejects.toThrow('Credenciais inválidas');
    });
  });
});
