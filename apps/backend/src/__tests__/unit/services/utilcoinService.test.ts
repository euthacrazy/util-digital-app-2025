import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import {
  mintUtilCoins,
  burnForDiscount,
  stakeUtilCoins,
  getUtilCoinBalance,
  getStakedBalance,
  syncUtilCoinBalance
} from '../../../services/utilcoin';
import { AppError } from '../../../middlewares/errorHandler';

// Mock do PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn()
}));

// Mock do ethers
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn(),
  Wallet: jest.fn(),
  Contract: jest.fn(),
  parseEther: jest.fn(),
  formatEther: jest.fn()
}));

describe('UtilCoinService', () => {
  let prismaMock: DeepMockProxy<PrismaClient>;
  let contractMock: any;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    (PrismaClient as jest.Mock).mockImplementation(() => prismaMock);
    mockReset(prismaMock);

    // Mock do contrato
    contractMock = {
      mint: jest.fn(),
      burnForDiscount: jest.fn(),
      stake: jest.fn(),
      balanceOf: jest.fn(),
      stakedBalance: jest.fn()
    };

    (ethers.Contract as jest.Mock).mockReturnValue(contractMock);
    (ethers.parseEther as jest.Mock).mockImplementation((value) => value);
    (ethers.formatEther as jest.Mock).mockImplementation((value) => value);
  });

  describe('mintUtilCoins', () => {
    it('deve mintar UtilCoins corretamente', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue(undefined),
        hash: '0xtxhash123'
      };

      contractMock.mint.mockResolvedValue(mockTx);

      const result = await mintUtilCoins('0xaddress', '100');

      expect(result).toBe('0xtxhash123');
      expect(contractMock.mint).toHaveBeenCalledWith('0xaddress', '100');
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('deve lidar com erros ao mintar', async () => {
      contractMock.mint.mockRejectedValue(new Error('Mint failed'));

      await expect(mintUtilCoins('0xaddress', '100'))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('burnForDiscount', () => {
    it('deve queimar tokens para desconto', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue(undefined),
        hash: '0xtxhash123'
      };

      contractMock.burnForDiscount.mockResolvedValue(mockTx);

      const result = await burnForDiscount('0xaddress', '50');

      expect(result).toBe('0xtxhash123');
      expect(contractMock.burnForDiscount).toHaveBeenCalledWith('50');
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('deve lidar com erros ao queimar tokens', async () => {
      contractMock.burnForDiscount.mockRejectedValue(new Error('Burn failed'));

      await expect(burnForDiscount('0xaddress', '50'))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('stakeUtilCoins', () => {
    it('deve fazer stake de tokens', async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue(undefined),
        hash: '0xtxhash123'
      };

      contractMock.stake.mockResolvedValue(mockTx);

      const result = await stakeUtilCoins('0xaddress', '200');

      expect(result).toBe('0xtxhash123');
      expect(contractMock.stake).toHaveBeenCalledWith('200');
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('deve lidar com erros ao fazer stake', async () => {
      contractMock.stake.mockRejectedValue(new Error('Stake failed'));

      await expect(stakeUtilCoins('0xaddress', '200'))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('getUtilCoinBalance', () => {
    it('deve retornar o saldo de UtilCoins', async () => {
      contractMock.balanceOf.mockResolvedValue('1000');

      const balance = await getUtilCoinBalance('0xaddress');

      expect(balance).toBe('1000');
      expect(contractMock.balanceOf).toHaveBeenCalledWith('0xaddress');
    });

    it('deve lidar com erros ao buscar saldo', async () => {
      contractMock.balanceOf.mockRejectedValue(new Error('Balance check failed'));

      await expect(getUtilCoinBalance('0xaddress'))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('getStakedBalance', () => {
    it('deve retornar o saldo em stake', async () => {
      contractMock.stakedBalance.mockResolvedValue('500');

      const balance = await getStakedBalance('0xaddress');

      expect(balance).toBe('500');
      expect(contractMock.stakedBalance).toHaveBeenCalledWith('0xaddress');
    });

    it('deve lidar com erros ao buscar saldo em stake', async () => {
      contractMock.stakedBalance.mockRejectedValue(new Error('Staked balance check failed'));

      await expect(getStakedBalance('0xaddress'))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('syncUtilCoinBalance', () => {
    it('deve sincronizar saldo on-chain com banco de dados', async () => {
      const mockUser = {
        id: 'user123',
        wallet: {
          address: '0xaddress'
        }
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      contractMock.balanceOf.mockResolvedValue('1000');
      prismaMock.user.update.mockResolvedValue({} as any);

      await syncUtilCoinBalance('user123');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        include: { wallet: true }
      });

      expect(contractMock.balanceOf).toHaveBeenCalledWith('0xaddress');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          utilCoins: 1000
        }
      });
    });

    it('deve lançar erro se usuário não tem carteira', async () => {
      const mockUser = {
        id: 'user123',
        wallet: null
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(syncUtilCoinBalance('user123'))
        .rejects
        .toThrow('Carteira não encontrada');
    });

    it('deve lidar com erros na sincronização', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(syncUtilCoinBalance('user123'))
        .rejects
        .toThrow(Error);
    });
  });
});
