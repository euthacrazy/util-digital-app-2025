import { StoreService } from '../../../services/storeService';
import { prismaMock } from '../../setup';
import { uploadImage } from '../../../utils/uploadUtils';
import { PaymentMethod } from '@prisma/client';

jest.mock('../../../utils/uploadUtils', () => ({
  uploadImage: jest.fn().mockResolvedValue('https://example.com/image.jpg')
}));

describe('StoreService', () => {
  let storeService: StoreService;

  beforeEach(() => {
    storeService = new StoreService();
    jest.clearAllMocks();
  });

  describe('createStore', () => {
    it('should create a new store', async () => {
      const mockStore = {
        id: '1',
        name: 'Test Store',
        description: 'A test store description',
        logo: 'logo.jpg',
        banner: 'banner.jpg',
        ownerId: 'user123',
        active: true,
        acceptedPayments: [PaymentMethod.CREDIT_CARD],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.create.mockResolvedValue(mockStore);

      const result = await storeService.createStore({
        name: 'Test Store',
        description: 'Test Description',
        logo: 'base64logo',
        banner: 'base64banner',
        ownerId: '1'
      });

      expect(uploadImage).toHaveBeenCalledTimes(2);
      expect(prismaMock.store.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Store',
          description: 'Test Description',
          logo: 'https://example.com/image.jpg',
          banner: 'https://example.com/image.jpg',
          ownerId: '1',
          acceptedPayments: [PaymentMethod.CREDIT_CARD]
        }
      });
      expect(result).toEqual(mockStore);
    });

    it('should throw error if user already has a store', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        name: 'Existing Store',
        description: 'Existing Description',
        logo: 'https://example.com/existinglogo.jpg',
        banner: 'https://example.com/existingbanner.jpg',
        ownerId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(
        storeService.createStore({
          name: 'Test Store',
          ownerId: '1'
        })
      ).rejects.toThrow('Usuário já possui uma loja');
    });

    it('should handle image upload failure', async () => {
      (uploadImage as jest.Mock).mockRejectedValueOnce(new Error('Falha no upload'));

      await expect(storeService.createStore({
        name: 'Test Store',
        description: 'Test Description',
        logo: 'base64logo',
        banner: 'base64banner',
        ownerId: '1'
      })).rejects.toThrow('Falha no upload da imagem');
    });

    it('should validate image size', async () => {
      const largeBase64 = 'a'.repeat(5000000); // Simula uma imagem muito grande

      await expect(storeService.createStore({
        name: 'Test Store',
        description: 'Test Description',
        logo: largeBase64,
        banner: 'base64banner',
        ownerId: '1'
      })).rejects.toThrow('Imagem muito grande');
    });
  });

  describe('updateStore', () => {
    it('should update store details', async () => {
      const mockStore = {
        id: '1',
        name: 'Updated Store',
        description: 'Updated Description',
        logo: 'https://example.com/newlogo.jpg',
        banner: 'https://example.com/newbanner.jpg',
        ownerId: '1',
        active: true,
        acceptedPayments: [PaymentMethod.CREDIT_CARD],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        name: 'Old Store',
        description: 'Old Description',
        logo: 'https://example.com/oldlogo.jpg',
        banner: 'https://example.com/oldbanner.jpg',
        ownerId: '1',
        active: true,
        acceptedPayments: [PaymentMethod.CREDIT_CARD],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      prismaMock.store.update.mockResolvedValue(mockStore);

      const result = await storeService.updateStore('1', '1', {
        name: 'Updated Store',
        description: 'Updated Description',
        logo: 'base64newlogo',
        banner: 'base64newbanner'
      });

      expect(uploadImage).toHaveBeenCalledTimes(2);
      expect(prismaMock.store.update).toHaveBeenCalled();
      expect(result).toEqual(mockStore);
    });

    it('should throw error if store not found', async () => {
      prismaMock.store.findUnique.mockResolvedValue(null);

      await expect(
        storeService.updateStore('1', '1', {
          name: 'Updated Store'
        })
      ).rejects.toThrow('Loja não encontrada');
    });

    it('should throw error if user is not the owner', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        id: '1',
        name: 'Store',
        description: 'Store Description',
        logo: 'https://example.com/storelogo.jpg',
        banner: 'https://example.com/storebanner.jpg',
        ownerId: '2',
        active: true,
        acceptedPayments: [PaymentMethod.CREDIT_CARD],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(
        storeService.updateStore('1', '1', {
          name: 'Updated Store'
        })
      ).rejects.toThrow('Não autorizado');
    });

    it('should handle partial updates correctly', async () => {
      const mockStore = {
        id: '1',
        name: 'Original Store',
        description: 'Original description',
        logo: 'original-logo.jpg',
        banner: 'original-banner.jpg',
        ownerId: '1',
        active: true,
        acceptedPayments: [PaymentMethod.CREDIT_CARD],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.findUnique.mockResolvedValue(mockStore);
      prismaMock.store.update.mockResolvedValue({
        ...mockStore,
        name: 'Updated Store'
      });

      const result = await storeService.updateStore('1', {
        name: 'Updated Store'
      });

      expect(prismaMock.store.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated Store' }
      });
      expect(result.name).toBe('Updated Store');
      expect(result.description).toBe('Original description');
    });
  });

  describe('getStore', () => {
    it('should return store details with products', async () => {
      const mockStore = {
        id: '1',
        name: 'Test Store',
        description: 'A test store description',
        logo: 'logo.jpg',
        banner: 'banner.jpg',
        ownerId: '1',
        active: true,
        acceptedPayments: [PaymentMethod.CREDIT_CARD],
        products: [
          {
            id: '1',
            name: 'Product 1',
            price: 100
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.store.findUnique.mockResolvedValue(mockStore);

      const result = await storeService.getStore('1');

      expect(prismaMock.store.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          products: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      expect(result).toEqual(mockStore);
    });

    it('should throw error if store not found', async () => {
      prismaMock.store.findUnique.mockResolvedValue(null);

      await expect(storeService.getStore('1')).rejects.toThrow('Loja não encontrada');
    });
  });
});
