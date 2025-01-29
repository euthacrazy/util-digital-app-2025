import { UserService } from '../../../services/userService';
import { prismaMock } from '../../setup';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('token123')
}));

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with wallet and referral code', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        phone: null,
        avatar: null,
        isAdmin: false,
        role: UserRole.CUSTOMER,
        utilCoins: 0,
        referralCode: 'REF123',
        referredBy: null,
        referralCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockWallet = {
        id: '1',
        userId: '1',
        balance: 0,
        address: '0x123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.create.mockResolvedValue(mockUser);
      prismaMock.wallet.create.mockResolvedValue(mockWallet);

      const result = await userService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

      expect(bcryptjs.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.wallet.create).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        token: 'token123'
      });
    });

    it('should throw error if email already exists', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        phone: null,
        avatar: null,
        isAdmin: false,
        role: UserRole.CUSTOMER,
        utilCoins: 0,
        referralCode: 'REF123',
        referredBy: null,
        referralCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        userService.register({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123'
        })
      ).rejects.toThrow('Email já está em uso');
    });

    it('should throw error when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Existing User',
        password: 'hashedPassword',
        phone: null,
        avatar: null,
        isAdmin: false,
        role: UserRole.CUSTOMER,
        utilCoins: 0,
        referralCode: 'REF123',
        referredBy: null,
        referralCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(userService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })).rejects.toThrow('Email já está em uso');
    });

    it('should throw error when wallet creation fails', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        phone: null,
        avatar: null,
        isAdmin: false,
        role: UserRole.CUSTOMER,
        utilCoins: 0,
        referralCode: 'REF123',
        referredBy: null,
        referralCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.create.mockResolvedValue(mockUser);
      prismaMock.wallet.create.mockRejectedValue(new Error('Falha ao criar carteira'));

      await expect(userService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })).rejects.toThrow('Falha ao criar carteira');
    });
  });

  describe('login', () => {
    it('should return user and token if credentials are valid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        phone: null,
        avatar: null,
        isAdmin: false,
        role: UserRole.CUSTOMER,
        utilCoins: 0,
        referralCode: 'REF123',
        referredBy: null,
        referralCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.login(
        'test@example.com',
        'password123'
      );

      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        token: 'token123'
      });
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        userService.login(
          'nonexistent@example.com',
          'password123'
        )
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('should throw error if password is invalid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        phone: null,
        avatar: null,
        isAdmin: false,
        role: UserRole.CUSTOMER,
        utilCoins: 0,
        referralCode: 'REF123',
        referredBy: null,
        referralCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        userService.login(
          'test@example.com',
          'wrongpassword'
        )
      ).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile with wallet', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        phone: null,
        avatar: null,
        isAdmin: false,
        role: UserRole.CUSTOMER,
        utilCoins: 0,
        referralCode: 'REF123',
        referredBy: null,
        referralCount: 0,
        wallet: {
          balance: 100
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserProfile('1');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          wallet: true,
          store: true
        }
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(userService.getUserProfile('1')).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('updateProfile', () => {
    it('should validate phone format', async () => {
      await expect(userService.updateProfile('1', {
        phone: '123'  // formato inválido
      })).rejects.toThrow('Formato de telefone inválido');
    });

    it('should update password with correct validation', async () => {
      const mockUser = {
        id: '1',
        password: 'oldHashedPassword',
        // ... outros campos
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      bcryptjs.compare.mockResolvedValueOnce(true);  // senha atual correta
      
      await userService.updateProfile('1', {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123'
      });

      expect(bcryptjs.hash).toHaveBeenCalledWith('newPassword123', 10);
    });
  });
});
