import { PrismaClient } from '@prisma/client';
import { mintUtilCoins } from './blockchain';
import { AppError } from '../middlewares/errorHandler';

const prisma = new PrismaClient();

// Configurações de recompensas
const REWARD_PERCENTAGE = 0.01; // 1% do valor da compra em UtilCoins
const REFERRAL_PERCENTAGE = 0.015; // 1.5% para quem indicou

export async function calculateRewards(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      store: {
        include: {
          owner: true
        }
      }
    }
  });

  if (!order) {
    throw new AppError(404, 'Pedido não encontrado');
  }

  // Recompensa para o comprador
  const customerReward = order.total.toNumber() * REWARD_PERCENTAGE;
  await prisma.user.update({
    where: { id: order.customerId },
    data: {
      utilCoins: {
        increment: customerReward
      }
    }
  });

  // Tentar mintar UtilCoins para o comprador
  try {
    await mintUtilCoins(order.customer.wallet?.address || '', customerReward.toString());
  } catch (error) {
    console.error('Erro ao mintar UtilCoins:', error);
    // Continuar mesmo se falhar o mint, já que atualizamos o banco
  }

  // Recompensa para quem indicou (se houver)
  if (order.customer.referredBy) {
    const referralReward = order.total.toNumber() * REFERRAL_PERCENTAGE;
    await prisma.user.update({
      where: { id: order.customer.referredBy },
      data: {
        utilCoins: {
          increment: referralReward
        }
      }
    });

    // Buscar carteira de quem indicou
    const referrer = await prisma.user.findUnique({
      where: { id: order.customer.referredBy },
      include: { wallet: true }
    });

    // Tentar mintar UtilCoins para quem indicou
    if (referrer?.wallet) {
      try {
        await mintUtilCoins(referrer.wallet.address, referralReward.toString());
      } catch (error) {
        console.error('Erro ao mintar UtilCoins para referral:', error);
      }
    }
  }
}

export async function getGameReward(userId: string): Promise<number> {
  // Valor aleatório entre 1 e 100 UtilCoins
  const reward = Math.floor(Math.random() * 100) + 1;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user) {
    throw new AppError(404, 'Usuário não encontrado');
  }

  // Atualizar saldo de UtilCoins
  await prisma.user.update({
    where: { id: userId },
    data: {
      utilCoins: {
        increment: reward
      }
    }
  });

  // Tentar mintar UtilCoins
  if (user.wallet) {
    try {
      await mintUtilCoins(user.wallet.address, reward.toString());
    } catch (error) {
      console.error('Erro ao mintar UtilCoins do jogo:', error);
    }
  }

  return reward;
}
