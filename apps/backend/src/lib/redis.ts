import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('error', (error) => {
  console.error('Erro na conexão Redis:', error);
});

redisClient.on('connect', () => {
  console.log('Conectado ao Redis');
});

export default redisClient;
