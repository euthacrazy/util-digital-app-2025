import { PrismaClient, User, UserRole } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { generateReferralCode } from '../utils/referralUtils';

export class UserService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    referredBy?: string;
  }): Promise<{ user: User; token: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await hash(data.password, 10);
    const referralCode = generateReferralCode();

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || UserRole.CUSTOMER,
        referralCode,
        referredBy: data.referredBy,
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
      include: {
        wallet: true,
      },
    });

    if (data.referredBy) {
      await this.addReferralBonus(data.referredBy);
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        wallet: true,
      },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        store: true,
        referredUsers: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: {
    name?: string;
    email?: string;
    password?: string;
  }): Promise<User> {
    if (data.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already in use');
      }
    }

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await hash(data.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        wallet: true,
      },
    });

    return user;
  }

  private async addReferralBonus(referrerId: string): Promise<void> {
    const referralBonus = 100; // 100 UtilCoins por referral

    await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        utilCoins: {
          increment: referralBonus,
        },
      },
    });
  }

  private generateToken(user: User): string {
    const secret = process.env.JWT_SECRET || 'your-jwt-secret-key';
    return sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '7d' }
    );
  }
}
