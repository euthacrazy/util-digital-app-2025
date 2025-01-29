import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';

const prisma = new PrismaClient();

// ABI do contrato UtilCoin (será preenchido após o deploy)
const UTIL_COIN_ABI = []; // TODO: Adicionar ABI após deploy
const UTIL_COIN_ADDRESS = process.env.UTIL_COIN_ADDRESS;
const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-rpc.com';

// Provider e Wallet para interação com a blockchain
const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
const adminWallet = new ethers.Wallet(
  process.env.ADMIN_PRIVATE_KEY || '',
  provider
);

// Contrato UtilCoin
const utilCoinContract = new ethers.Contract(
  UTIL_COIN_ADDRESS || '',
  UTIL_COIN_ABI,
  adminWallet
);

export async function mintUtilCoins(toAddress: string, amount: string) {
  try {
    const tx = await utilCoinContract.mint(toAddress, ethers.parseEther(amount));
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Erro ao mintar UtilCoins:', error);
    throw new AppError(500, 'Erro ao mintar UtilCoins');
  }
}

export async function burnForDiscount(
  userAddress: string,
  amount: string
): Promise<string> {
  try {
    const tx = await utilCoinContract.burnForDiscount(ethers.parseEther(amount));
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Erro ao queimar UtilCoins para desconto:', error);
    throw new AppError(500, 'Erro ao processar desconto');
  }
}

export async function stakeUtilCoins(
  userAddress: string,
  amount: string
): Promise<string> {
  try {
    const tx = await utilCoinContract.stake(ethers.parseEther(amount));
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Erro ao fazer stake de UtilCoins:', error);
    throw new AppError(500, 'Erro ao fazer stake');
  }
}

export async function getUtilCoinBalance(address: string): Promise<string> {
  try {
    const balance = await utilCoinContract.balanceOf(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Erro ao buscar saldo de UtilCoins:', error);
    throw new AppError(500, 'Erro ao buscar saldo');
  }
}

export async function getStakedBalance(address: string): Promise<string> {
  try {
    const balance = await utilCoinContract.stakedBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Erro ao buscar saldo de stake:', error);
    throw new AppError(500, 'Erro ao buscar saldo de stake');
  }
}

// Função para sincronizar saldo on-chain com o banco de dados
export async function syncUtilCoinBalance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user?.wallet) {
    throw new AppError(404, 'Carteira não encontrada');
  }

  const onChainBalance = await getUtilCoinBalance(user.wallet.address);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      utilCoins: parseFloat(onChainBalance)
    }
  });

  return onChainBalance;
}
