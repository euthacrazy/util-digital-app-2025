import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler';
import { generateToken } from '../middlewares/auth';
import { CreateUserDTO, LoginDTO } from '../types';
import { generateWallet } from '../services/blockchain';

const prisma = new PrismaClient();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'VENDOR', 'CUSTOMER']),
  referralCode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export class AuthController {
  async register(req: Request, res: Response) {
    const data = createUserSchema.parse(req.body) as CreateUserDTO;
    
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new AppError(400, 'Email já cadastrado');
    }

    // Gerar código de referência único
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Processar código de referência se fornecido
    let referredByUserId: string | null = null;
    if (data.referralCode) {
      const referrer = await prisma.user.findFirst({
        where: { referralCode: data.referralCode }
      });
      if (referrer) {
        referredByUserId = referrer.id;
      }
    }

    // Criar carteira blockchain
    const wallet = await generateWallet();

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        referralCode,
        referredBy: referredByUserId,
        wallet: {
          create: {
            address: wallet.address,
            privateKey: wallet.privateKey // Deve ser criptografado antes de armazenar
          }
        }
      }
    });

    const token = generateToken({
      userId: user.id,
      role: user.role
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        referralCode: user.referralCode
      },
      token
    });
  }

  async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body) as LoginDTO;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AppError(401, 'Credenciais inválidas');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new AppError(401, 'Credenciais inválidas');
    }

    const token = generateToken({
      userId: user.id,
      role: user.role
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        referralCode: user.referralCode
      },
      token
    });
  }

  async me(req: Request, res: Response) {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        utilCoins: true,
        referralCode: true,
        wallet: {
          select: {
            address: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError(404, 'Usuário não encontrado');
    }

    return res.json(user);
  }
}
