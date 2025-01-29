import { Request, Response } from 'express';
import { GameController } from '../../controllers/gameController';
import { prismaMock } from '../setup';
import { UserRole, OrderStatus } from '@prisma/client';
import { CacheService } from '../../services/cache';

interface CustomRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

jest.mock('../../services/cache');

describe('GameController', () => {
  let gameController: GameController;
  let req: Partial<CustomRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    gameController = new GameController();
    req = {
      user: {
        userId: '1',
        role: UserRole.CUSTOMER
      }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('playDaily', () => {
    it('should allow user to play and win UtilCoins', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        utilCoins: 100,
        role: UserRole.CUSTOMER,
        referralCode: 'ABC123',
        password: 'hashed',
        referredBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const lastPlay = new Date();
      lastPlay.setDate(lastPlay.getDate() - 1); // último jogo foi ontem

      prismaMock.gamePlay.findFirst.mockResolvedValue({
        id: 'play1',
        userId: '1',
        reward: 10,
        playedAt: lastPlay,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        utilCoins: 110
      });

      await gameController.playDaily(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          reward: expect.any(Number),
          newBalance: expect.any(Number)
        })
      );
    });

    it('should not allow user to play twice in the same day', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        utilCoins: 100,
        role: UserRole.CUSTOMER,
        referralCode: 'ABC123',
        password: 'hashed',
        referredBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const lastPlay = new Date(); // último jogo foi hoje

      prismaMock.gamePlay.findFirst.mockResolvedValue({
        id: 'play1',
        userId: '1',
        reward: 10,
        playedAt: lastPlay,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(
        gameController.playDaily(req as Request, res as Response)
      ).rejects.toThrow('Você já jogou hoje');
    });
  });

  describe('getLeaderboard', () => {
    it('should return cached leaderboard if available', async () => {
      const mockLeaderboard = [
        {
          id: '1',
          name: 'Top User',
          email: 'top@example.com',
          utilCoins: 1000,
          role: UserRole.CUSTOMER,
          password: 'hashed',
          referralCode: 'ABC123',
          referredBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (CacheService.get as jest.Mock).mockResolvedValue(mockLeaderboard);

      await gameController.getLeaderboard(req as Request, res as Response);

      expect(CacheService.get).toHaveBeenCalledWith('leaderboard');
      expect(res.json).toHaveBeenCalledWith({ leaderboard: mockLeaderboard });
    });

    it('should fetch and cache leaderboard if not cached', async () => {
      const mockLeaderboard = [
        {
          id: '1',
          name: 'Top User',
          email: 'top@example.com',
          utilCoins: 1000,
          role: UserRole.CUSTOMER,
          password: 'hashed',
          referralCode: 'ABC123',
          referredBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (CacheService.get as jest.Mock).mockResolvedValue(null);
      prismaMock.user.findMany.mockResolvedValue(mockLeaderboard);

      await gameController.getLeaderboard(req as Request, res as Response);

      expect(CacheService.set).toHaveBeenCalledWith(
        'leaderboard',
        mockLeaderboard,
        300
      );
      expect(res.json).toHaveBeenCalledWith({ leaderboard: mockLeaderboard });
    });
  });

  describe('getReferralStats', () => {
    it('should return user referral statistics', async () => {
      const mockReferrals = [
        {
          id: '2',
          name: 'Referred User 1',
          email: 'ref1@example.com',
          utilCoins: 50,
          role: UserRole.CUSTOMER,
          password: 'hashed',
          referralCode: 'DEF456',
          referredBy: '1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          name: 'Referred User 2',
          email: 'ref2@example.com',
          utilCoins: 30,
          role: UserRole.CUSTOMER,
          password: 'hashed',
          referralCode: 'GHI789',
          referredBy: '1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prismaMock.user.findMany.mockResolvedValue(mockReferrals);
      prismaMock.user.count.mockResolvedValue(2);

      await gameController.getReferralStats(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        totalReferrals: 2,
        referrals: mockReferrals
      });
    });
  });

  describe('getAchievements', () => {
    it('should return user achievements', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        utilCoins: 1000,
        role: UserRole.CUSTOMER,
        password: 'hashed',
        referralCode: 'ABC123',
        referredBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockReferrals = [
        {
          id: '2',
          name: 'Referred User 1',
          email: 'ref1@example.com',
          utilCoins: 50,
          role: UserRole.CUSTOMER,
          password: 'hashed',
          referralCode: 'DEF456',
          referredBy: '1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockOrders = [
        {
          id: 'order1',
          customerId: '1',
          storeId: 'store1',
          total: 100,
          status: OrderStatus.DELIVERED,
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeSessionId: null
        }
      ];

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.findMany.mockResolvedValue(mockReferrals);
      prismaMock.order.findMany.mockResolvedValue(mockOrders);

      await gameController.getAchievements(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          achievements: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              description: expect.any(String),
              completed: expect.any(Boolean)
            })
          ])
        })
      );
    });
  });
});
