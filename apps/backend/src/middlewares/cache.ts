import { Request, Response, NextFunction } from 'express';
import redisClient from '../lib/redis';

interface CacheOptions {
  duration?: number; // Duração em segundos
  key?: string | ((req: Request) => string);
}

const DEFAULT_DURATION = 300; // 5 minutos

export function cache(options: CacheOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = typeof options.key === 'function'
      ? options.key(req)
      : options.key || `${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Interceptar o método json para armazenar em cache
      const oldJson = res.json;
      res.json = function(data) {
        redisClient.set(
          key,
          JSON.stringify(data),
          'EX',
          options.duration || DEFAULT_DURATION
        );
        return oldJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Erro no middleware de cache:', error);
      next();
    }
  };
}

export function clearCache(pattern: string) {
  return new Promise<void>((resolve, reject) => {
    const stream = redisClient.scanStream({
      match: pattern,
      count: 100
    });

    stream.on('data', (keys: string[]) => {
      if (keys.length) {
        const pipeline = redisClient.pipeline();
        keys.forEach((key) => {
          pipeline.del(key);
        });
        pipeline.exec();
      }
    });

    stream.on('end', () => resolve());
    stream.on('error', (error) => reject(error));
  });
}

export function invalidateCache(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const oldJson = res.json;
    res.json = function(data) {
      Promise.all(patterns.map(pattern => clearCache(pattern)))
        .catch(error => console.error('Erro ao invalidar cache:', error));
      return oldJson.call(this, data);
    };
    next();
  };
}
