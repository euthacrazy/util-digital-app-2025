import { CacheService } from '../../../services/cache';
import redisClient from '../../../lib/redis';

// Mock do cliente Redis
jest.mock('../../../lib/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn()
  }
}));

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Operações básicas de cache', () => {
    it('deve obter dados do cache', async () => {
      const mockData = { id: 1, name: 'Test' };
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await CacheService.get('test-key');
      expect(result).toEqual(mockData);
      expect(redisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('deve retornar null quando dado não existe no cache', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await CacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('deve salvar dados no cache', async () => {
      const data = { id: 1, name: 'Test' };
      await CacheService.set('test-key', data, 300);

      expect(redisClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(data),
        'EX',
        300
      );
    });

    it('deve deletar dados do cache', async () => {
      await CacheService.del('test-key');
      expect(redisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('deve limpar cache por padrão', async () => {
      const mockKeys = ['key1', 'key2'];
      (redisClient.keys as jest.Mock).mockResolvedValue(mockKeys);

      await CacheService.clearPattern('test*');

      expect(redisClient.keys).toHaveBeenCalledWith('test*');
      expect(redisClient.del).toHaveBeenCalledWith(...mockKeys);
    });
  });

  describe('Cache de Produtos', () => {
    it('deve gerenciar cache de produtos', async () => {
      const mockProduct = { id: '1', name: 'Produto Test' };
      
      await CacheService.setProductCache('1', mockProduct);
      expect(redisClient.set).toHaveBeenCalledWith(
        'product:1',
        JSON.stringify(mockProduct),
        'EX',
        3600
      );

      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockProduct));
      const cachedProduct = await CacheService.getProductCache('1');
      expect(cachedProduct).toEqual(mockProduct);

      await CacheService.invalidateProductCache('1');
      expect(redisClient.keys).toHaveBeenCalledWith('product:1');
      expect(redisClient.keys).toHaveBeenCalledWith('list:products:*');
    });
  });

  describe('Cache de Lojas', () => {
    it('deve gerenciar cache de lojas', async () => {
      const mockStore = { id: '1', name: 'Loja Test' };
      
      await CacheService.setStoreCache('1', mockStore);
      expect(redisClient.set).toHaveBeenCalledWith(
        'store:1',
        JSON.stringify(mockStore),
        'EX',
        3600
      );

      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockStore));
      const cachedStore = await CacheService.getStoreCache('1');
      expect(cachedStore).toEqual(mockStore);

      await CacheService.invalidateStoreCache('1');
      expect(redisClient.keys).toHaveBeenCalledWith('store:1');
      expect(redisClient.keys).toHaveBeenCalledWith('list:stores:*');
    });
  });

  describe('Cache de Listagens', () => {
    it('deve gerenciar cache de listagens paginadas', async () => {
      const mockList = [{ id: 1 }, { id: 2 }];
      
      await CacheService.setListCache('products', 1, 10, mockList);
      expect(redisClient.set).toHaveBeenCalledWith(
        'list:products:1:10',
        JSON.stringify(mockList),
        'EX',
        300
      );

      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockList));
      const cachedList = await CacheService.getListCache('products', 1, 10);
      expect(cachedList).toEqual(mockList);
    });
  });

  describe('Cache de Usuários', () => {
    it('deve gerenciar cache de usuários', async () => {
      const mockUser = { id: '1', name: 'User Test' };
      
      await CacheService.setUserCache('1', mockUser);
      expect(redisClient.set).toHaveBeenCalledWith(
        'user:1',
        JSON.stringify(mockUser),
        'EX',
        1800
      );

      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockUser));
      const cachedUser = await CacheService.getUserCache('1');
      expect(cachedUser).toEqual(mockUser);

      await CacheService.invalidateUserCache('1');
      expect(redisClient.keys).toHaveBeenCalledWith('user:1');
    });
  });

  describe('Cache de Estatísticas', () => {
    it('deve gerenciar cache de estatísticas', async () => {
      const mockStats = { total: 100, average: 50 };
      
      await CacheService.setStatsCache('sales', mockStats);
      expect(redisClient.set).toHaveBeenCalledWith(
        'stats:sales',
        JSON.stringify(mockStats),
        'EX',
        900
      );

      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockStats));
      const cachedStats = await CacheService.getStatsCache('sales');
      expect(cachedStats).toEqual(mockStats);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erros ao obter dados do cache', async () => {
      (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));
      
      const result = await CacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('deve lidar com erros ao salvar dados no cache', async () => {
      (redisClient.set as jest.Mock).mockRejectedValue(new Error('Redis error'));
      
      // Não deve lançar erro
      await expect(CacheService.set('test-key', { data: 'test' }))
        .resolves
        .toBeUndefined();
    });

    it('deve lidar com erros ao deletar dados do cache', async () => {
      (redisClient.del as jest.Mock).mockRejectedValue(new Error('Redis error'));
      
      // Não deve lançar erro
      await expect(CacheService.del('test-key'))
        .resolves
        .toBeUndefined();
    });
  });
});
