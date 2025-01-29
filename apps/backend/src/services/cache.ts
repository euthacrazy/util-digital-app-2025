import redisClient from '../lib/redis';

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erro ao buscar do cache:', error);
      return null;
    }
  }

  static async set(key: string, value: any, duration: number = 300): Promise<void> {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', duration);
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Erro ao deletar do cache:', error);
    }
  }

  static async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error('Erro ao limpar cache por padrão:', error);
    }
  }

  // Cache específico para produtos
  static async getProductCache(id: string) {
    return this.get<any>(`product:${id}`);
  }

  static async setProductCache(id: string, data: any) {
    return this.set(`product:${id}`, data, 3600); // 1 hora
  }

  // Cache específico para lojas
  static async getStoreCache(id: string) {
    return this.get<any>(`store:${id}`);
  }

  static async setStoreCache(id: string, data: any) {
    return this.set(`store:${id}`, data, 3600); // 1 hora
  }

  // Cache para listagens com paginação
  static async getListCache(type: string, page: number, limit: number) {
    return this.get<any>(`list:${type}:${page}:${limit}`);
  }

  static async setListCache(type: string, page: number, limit: number, data: any) {
    return this.set(`list:${type}:${page}:${limit}`, data, 300); // 5 minutos
  }

  // Cache para dados de usuário
  static async getUserCache(id: string) {
    return this.get<any>(`user:${id}`);
  }

  static async setUserCache(id: string, data: any) {
    return this.set(`user:${id}`, data, 1800); // 30 minutos
  }

  // Cache para estatísticas
  static async getStatsCache(type: string) {
    return this.get<any>(`stats:${type}`);
  }

  static async setStatsCache(type: string, data: any) {
    return this.set(`stats:${type}`, data, 900); // 15 minutos
  }

  // Limpar cache por tipo
  static async invalidateProductCache(id: string) {
    await this.clearPattern(`product:${id}`);
    await this.clearPattern('list:products:*');
  }

  static async invalidateStoreCache(id: string) {
    await this.clearPattern(`store:${id}`);
    await this.clearPattern('list:stores:*');
  }

  static async invalidateUserCache(id: string) {
    await this.clearPattern(`user:${id}`);
  }

  static async invalidateStatsCache() {
    await this.clearPattern('stats:*');
  }
}
