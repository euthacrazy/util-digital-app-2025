import { PrismaClient, Store, Product } from '@prisma/client';
import { uploadImage } from '../utils/uploadUtils';

export class StoreService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createStore(data: {
    name: string;
    description?: string;
    logo?: string;
    banner?: string;
    ownerId: string;
  }): Promise<Store> {
    const existingStore = await this.prisma.store.findUnique({
      where: { ownerId: data.ownerId },
    });

    if (existingStore) {
      throw new Error('User already has a store');
    }

    // Upload logo and banner if provided
    const logoUrl = data.logo ? await uploadImage(data.logo, 'store-logos') : undefined;
    const bannerUrl = data.banner ? await uploadImage(data.banner, 'store-banners') : undefined;

    const store = await this.prisma.store.create({
      data: {
        name: data.name,
        description: data.description,
        logo: logoUrl,
        banner: bannerUrl,
        ownerId: data.ownerId,
      },
    });

    return store;
  }

  async updateStore(
    storeId: string,
    ownerId: string,
    data: {
      name?: string;
      description?: string;
      logo?: string;
      banner?: string;
    }
  ): Promise<Store> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    if (store.ownerId !== ownerId) {
      throw new Error('Unauthorized');
    }

    // Upload new images if provided
    const logoUrl = data.logo ? await uploadImage(data.logo, 'store-logos') : undefined;
    const bannerUrl = data.banner ? await uploadImage(data.banner, 'store-banners') : undefined;

    const updatedStore = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        name: data.name,
        description: data.description,
        logo: logoUrl || store.logo,
        banner: bannerUrl || store.banner,
      },
    });

    return updatedStore;
  }

  async getStore(storeId: string): Promise<Store & { products: Product[] }> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        products: true,
      },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    return store;
  }

  async getStoreByOwner(ownerId: string): Promise<Store & { products: Product[] }> {
    const store = await this.prisma.store.findUnique({
      where: { ownerId },
      include: {
        products: true,
      },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    return store;
  }

  async getAllStores(page: number = 1, limit: number = 10): Promise<{
    stores: Store[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        skip,
        take: limit,
        include: {
          products: {
            take: 5, // Preview dos últimos 5 produtos
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      }),
      this.prisma.store.count(),
    ]);

    return {
      stores,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getStoreSales(storeId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  }> {
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startDate,
        },
        status: {
          in: ['PAID', 'SHIPPED', 'DELIVERED'],
        },
      },
      select: {
        total: true,
      },
    });

    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
    };
  }
}
