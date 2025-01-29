import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { CacheService } from '../services/cache';

export class GameController {
  async playDaily(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Usuário não autenticado');

    // Verifica se o usuário já jogou hoje
    const lastPlay = await prisma.gamePlay.findFirst({
      where: {
        userId,
        playedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    if (lastPlay) {
      throw new AppError(400, 'Você já jogou hoje');
    }

    // Gera uma recompensa aleatória entre 1 e 20 UtilCoins
    const reward = Math.floor(Math.random() * 20) + 1;

    // Registra o jogo e atualiza os UtilCoins do usuário
    const [play, user] = await prisma.$transaction([
      prisma.gamePlay.create({
        data: {
          userId,
          reward
        }
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          utilCoins: {
            increment: reward
          }
        }
      })
    ]);

    // Invalida o cache do leaderboard
    await CacheService.del('leaderboard');

    return res.json({
      reward,
      newBalance: user.utilCoins
    });
  }

  async getLeaderboard(req: Request, res: Response) {
    // Tenta buscar do cache
    const cached = await CacheService.get<any[]>('leaderboard');
    if (cached) {
      return res.json({ leaderboard: cached });
    }

    // Se não estiver em cache, busca do banco
    const leaderboard = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        utilCoins: true
      },
      orderBy: {
        utilCoins: 'desc'
      },
      take: 100
    });

    // Salva no cache por 5 minutos
    await CacheService.set('leaderboard', leaderboard, 300);

    return res.json({ leaderboard });
  }

  async getReferralStats(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Usuário não autenticado');

    // Tenta buscar do cache
    const cacheKey = `referral_stats:${userId}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [referrals, totalReferrals] = await Promise.all([
      prisma.user.findMany({
        where: {
          referredBy: userId
        },
        select: {
          id: true,
          name: true,
          utilCoins: true,
          createdAt: true
        }
      }),
      prisma.user.count({
        where: {
          referredBy: userId
        }
      })
    ]);

    const stats = {
      totalReferrals,
      referrals
    };

    // Salva no cache por 5 minutos
    await CacheService.set(cacheKey, stats, 300);

    return res.json(stats);
  }

  async getAchievements(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Usuário não autenticado');

    // Tenta buscar do cache
    const cacheKey = `achievements:${userId}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        utilCoins: true,
        referralCode: true
      }
    });

    if (!user) throw new AppError(404, 'Usuário não encontrado');

    const [referrals, orders] = await Promise.all([
      prisma.user.findMany({
        where: {
          referredBy: userId
        }
      }),
      prisma.order.findMany({
        where: {
          customerId: userId,
          status: 'DELIVERED'
        }
      })
    ]);

    const achievements = [
      {
        id: 'first_purchase',
        name: 'Primeira Compra',
        description: 'Faça sua primeira compra',
        completed: orders.length > 0
      },
      {
        id: 'five_purchases',
        name: 'Comprador Frequente',
        description: 'Faça 5 compras',
        completed: orders.length >= 5
      },
      {
        id: 'first_referral',
        name: 'Primeiro Convite',
        description: 'Convide seu primeiro amigo',
        completed: referrals.length > 0
      },
      {
        id: 'three_referrals',
        name: 'Influenciador',
        description: 'Convide 3 amigos',
        completed: referrals.length >= 3
      },
      {
        id: 'util_coins_100',
        name: 'Colecionador Iniciante',
        description: 'Acumule 100 UtilCoins',
        completed: user.utilCoins >= 100
      },
      {
        id: 'util_coins_1000',
        name: 'Colecionador Avançado',
        description: 'Acumule 1000 UtilCoins',
        completed: user.utilCoins >= 1000
      }
    ];

    const response = { achievements };

    // Salva no cache por 5 minutos
    await CacheService.set(cacheKey, response, 300);

    return res.json(response);
  }
}
