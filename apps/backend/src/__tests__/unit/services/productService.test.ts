import { ProductService } from '../../../services/productService';
import { prismaMock } from '../../setup';
import { uploadImage } from '../../../utils/uploadUtils';

jest.mock('../../../utils/uploadUtils', () => ({
  uploadImage: jest.fn().mockResolvedValue('https://example.com/image.jpg')
}));

describe('ProductService', () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = new ProductService();
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        description: 'A test product description',
        price: 100,
        storeId: 'store123',
        categoryId: 'category123',
        attributes: {
          color: 'red',
          size: 'medium'
        },
        images: ['https://example.com/image.jpg'],
        active: true,
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

      const result = await productService.createProduct('1', {
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        images: ['base64image'],
        categoryId: '1',
        storeId: '1'
      });

      expect(uploadImage).toHaveBeenCalled();
      expect(prismaMock.product.create).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw error if store not found', async () => {
      prismaMock.store.findUnique.mockResolvedValue(null);

      await expect(
        productService.createProduct('1', {
          name: 'Test Product',
          description: 'Test Description',
          price: 100,
          images: ['base64image'],
          categoryId: '1',
          storeId: '1'
        })
      ).rejects.toThrow('Loja não encontrada');
    });
  });

  describe('updateProduct', () => {
    it('should update product details', async () => {
      const mockProduct = {
        id: '1',
        name: 'Updated Product',
        description: 'Updated Description',
        price: 200,
        storeId: 'store123',
        categoryId: 'category123',
        attributes: {
          color: 'blue',
          size: 'large'
        },
        images: ['https://example.com/newimage.jpg'],
        active: true,
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

      const result = await productService.updateProduct('1', '1', {
        name: 'Updated Product',
        description: 'Updated Description',
        price: 200,
        images: ['base64newimage']
      });

      expect(uploadImage).toHaveBeenCalled();
      expect(prismaMock.product.update).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw error if product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        productService.updateProduct('1', '1', {
          name: 'Updated Product'
        })
      ).rejects.toThrow('Produto não encontrado');
    });
  });

  describe('getProduct', () => {
    it('should return product details', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        description: 'A test product description',
        price: 100,
        storeId: 'store123',
        categoryId: 'category123',
        attributes: {
          color: 'red',
          size: 'medium'
        },
        images: ['https://example.com/image.jpg'],
        active: true,
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

      const result = await productService.getProduct('1');

      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          store: true,
          category: true
        }
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw error if product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(productService.getProduct('1')).rejects.toThrow('Produto não encontrado');
    });
  });

  describe('listProducts', () => {
    it('should return list of products with pagination', async () => {
      const mockProducts = {
        items: [
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
        ],
        total: 2,
        page: 1,
        limit: 10
      };

      prismaMock.product.findMany.mockResolvedValue(mockProducts.items);
      prismaMock.product.count.mockResolvedValue(mockProducts.total);

      const result = await productService.listProducts({
        page: 1,
        limit: 10
      });

      expect(prismaMock.product.findMany).toHaveBeenCalled();
      expect(prismaMock.product.count).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });
  });
});
