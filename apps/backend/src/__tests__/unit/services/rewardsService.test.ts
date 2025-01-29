import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { calculateRewards, getGameReward } from '../../../services/rewards';
import { mintUtilCoins } from '../../../services/blockchain';

// Mock do PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn()
}));

// Mock do serviço blockchain
jest.mock('../../../services/blockchain', () => ({
  mintUtilCoins: jest.fn()
}));

describe('RewardsService', () => {
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    (PrismaClient as jest.Mock).mockImplementation(() => prismaMock);
    mockReset(prismaMock);
  });

  describe('calculateRewards', () => {
    it('should calculate and distribute rewards for an order', async () => {
      const mockOrder = {
        id: '1',
        customerId: 'customer123',
        total: {
          toNumber: () => 1000 // R$ 1000,00
        },
        customer: {
          id: 'customer123',
          wallet: {
            address: '0x123'
          },
          referredBy: 'referrer123'
        },
        store: {
          id: 'store123',
          owner: {
            id: 'owner123'
          }
        }
      };

      const mockReferrer = {
        id: 'referrer123',
        wallet: {
          address: '0x456'
        }
      };

      // Mock das chamadas do Prisma
      prismaMock.order.findUnique.mockResolvedValue(mockOrder as any);
      prismaMock.user.findUnique.mockResolvedValue(mockReferrer as any);
      prismaMock.user.update.mockResolvedValue({} as any);

      // Mock do mintUtilCoins
      (mintUtilCoins as jest.Mock).mockResolvedValue(undefined);

      await calculateRewards('1');

      // Verificar se as recompensas foram calculadas corretamente
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'customer123' },
        data: {
          utilCoins: {
            increment: 10 // 1% de 1000
          }
        }
      });

      // Verificar se as recompensas do referral foram calculadas
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'referrer123' },
        data: {
          utilCoins: {
            increment: 15 // 1.5% de 1000
          }
        }
      });

      // Verificar se os UtilCoins foram mintados
      expect(mintUtilCoins).toHaveBeenCalledWith('0x123', '10');
      expect(mintUtilCoins).toHaveBeenCalledWith('0x456', '15');
    });

    it('should handle orders without referral', async () => {
      const mockOrder = {
        id: '1',
        customerId: 'customer123',
        total: {
          toNumber: () => 1000
        },
        customer: {
          id: 'customer123',
          wallet: {
            address: '0x123'
          },
          referredBy: null
        },
        store: {
          id: 'store123',
          owner: {
            id: 'owner123'
          }
        }
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder as any);
      prismaMock.user.update.mockResolvedValue({} as any);
      (mintUtilCoins as jest.Mock).mockResolvedValue(undefined);

      await calculateRewards('1');

      // Verificar se apenas as recompensas do cliente foram processadas
      expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
      expect(mintUtilCoins).toHaveBeenCalledTimes(1);
    });
  });

  describe('getGameReward', () => {
    it('should generate and distribute game rewards', async () => {
      const mockUser = {
        id: 'user123',
        wallet: {
          address: '0x123'
        }
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.user.update.mockResolvedValue({} as any);
      (mintUtilCoins as jest.Mock).mockResolvedValue(undefined);

      const reward = await getGameReward('user123');

      // Verificar se a recompensa está dentro do intervalo esperado
      expect(reward).toBeGreaterThanOrEqual(1);
      expect(reward).toBeLessThanOrEqual(100);

      // Verificar se o usuário foi atualizado com a recompensa
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          utilCoins: {
            increment: reward
          }
        }
      });

      // Verificar se os UtilCoins foram mintados
      expect(mintUtilCoins).toHaveBeenCalledWith('0x123', reward.toString());
    });

    it('should handle users without wallet', async () => {
      const mockUser = {
        id: 'user123',
        wallet: null
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.user.update.mockResolvedValue({} as any);

      const reward = await getGameReward('user123');

      // Verificar se a recompensa foi processada mesmo sem carteira
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(mintUtilCoins).not.toHaveBeenCalled();
    });
  });
});
