import { ethers } from 'ethers';
import { Connection, Keypair } from '@solana/web3.js';
import { generateWallet, getPolygonBalance, sendMatic, mintUtilCoins } from '../../../services/blockchain';

// Mock do ethers
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn(),
  Wallet: {
    createRandom: jest.fn(),
  },
  formatEther: jest.fn(),
  parseEther: jest.fn()
}));

// Mock do @solana/web3.js
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  Keypair: {
    generate: jest.fn()
  }
}));

describe('BlockchainService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWallet', () => {
    it('deve gerar uma nova carteira', async () => {
      const mockWallet = {
        address: '0x123',
        privateKey: '0xabc'
      };

      (ethers.Wallet.createRandom as jest.Mock).mockReturnValue(mockWallet);
      (Keypair.generate as jest.Mock).mockReturnValue({
        publicKey: { toBase58: () => 'solana123' },
        secretKey: new Uint8Array(32)
      });

      const wallet = await generateWallet();

      expect(wallet).toEqual({
        address: '0x123',
        privateKey: '0xabc'
      });
      expect(ethers.Wallet.createRandom).toHaveBeenCalled();
      expect(Keypair.generate).toHaveBeenCalled();
    });
  });

  describe('getPolygonBalance', () => {
    it('deve retornar o saldo em MATIC', async () => {
      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(ethers.parseEther('1.5'))
      };

      (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);
      (ethers.formatEther as jest.Mock).mockReturnValue('1.5');

      const balance = await getPolygonBalance('0x123');

      expect(balance).toBe('1.5');
      expect(mockProvider.getBalance).toHaveBeenCalledWith('0x123');
      expect(ethers.formatEther).toHaveBeenCalled();
    });

    it('deve lidar com erros ao buscar saldo', async () => {
      const mockProvider = {
        getBalance: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);

      await expect(getPolygonBalance('0x123')).rejects.toThrow('Network error');
    });
  });

  describe('sendMatic', () => {
    it('deve enviar MATIC corretamente', async () => {
      const mockTx = { hash: '0xtxhash123' };
      const mockWallet = {
        sendTransaction: jest.fn().mockResolvedValue(mockTx)
      };

      (ethers.Wallet as any).mockImplementation(() => mockWallet);
      (ethers.parseEther as jest.Mock).mockReturnValue('1500000000000000000');

      const txHash = await sendMatic(
        '0xprivatekey',
        '0xrecipient',
        '1.5'
      );

      expect(txHash).toBe('0xtxhash123');
      expect(mockWallet.sendTransaction).toHaveBeenCalledWith({
        to: '0xrecipient',
        value: '1500000000000000000'
      });
    });

    it('deve lidar com erros ao enviar MATIC', async () => {
      const mockWallet = {
        sendTransaction: jest.fn().mockRejectedValue(new Error('Transaction failed'))
      };

      (ethers.Wallet as any).mockImplementation(() => mockWallet);

      await expect(sendMatic('0xprivatekey', '0xrecipient', '1.5'))
        .rejects
        .toThrow('Transaction failed');
    });
  });

  describe('mintUtilCoins', () => {
    it('deve lançar erro pois não está implementado', async () => {
      await expect(mintUtilCoins('0x123', '100'))
        .rejects
        .toThrow('Não implementado');
    });

    // Testes adicionais serão necessários quando a função for implementada
    // Por exemplo:
    // - Verificar se os tokens foram mintados corretamente
    // - Verificar se o evento de mint foi emitido
    // - Verificar se o saldo do usuário foi atualizado
    // - Verificar tratamento de erros (gas insuficiente, rede congestionada, etc)
  });
});
