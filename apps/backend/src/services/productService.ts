import { PrismaClient, Product } from '@prisma/client';
import { uploadImage } from '../utils/uploadUtils';

export class ProductService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createProduct(data: {
    name: string;
    description: string;
    price: number;
    images: string[];
    storeId: string;
    categoryId: string;
  }): Promise<Product> {
    // Upload das imagens
    const uploadedImages = await Promise.all(
      data.images.map(image => uploadImage(image, 'product-images'))
    );

    const product = await this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        images: uploadedImages,
        storeId: data.storeId,
        categoryId: data.categoryId,
      },
    });

    return product;
  }

  async updateProduct(
    productId: string,
    storeId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      images?: string[];
      categoryId?: string;
    }
  ): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.storeId !== storeId) {
      throw new Error('Unauthorized');
    }

    let uploadedImages = product.images;
    if (data.images && data.images.length > 0) {
      uploadedImages = await Promise.all(
        data.images.map(image => uploadImage(image, 'product-images'))
      );
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        images: uploadedImages,
        categoryId: data.categoryId,
      },
    });

    return updatedProduct;
  }

  async getProduct(productId: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
        category: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  async getStoreProducts(
    storeId: string,
    page: number = 1,
    limit: number = 10,
    categoryId?: string
  ): Promise<{
    products: Product[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const where = {
      storeId,
      ...(categoryId && { categoryId }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async searchProducts(
    query: string,
    categoryId?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    products: Product[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      ...(categoryId && { categoryId }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: true,
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async deleteProduct(productId: string, storeId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.storeId !== storeId) {
      throw new Error('Unauthorized');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });
  }

  async getCategories(): Promise<{
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
  }[]> {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createCategory(data: {
    name: string;
    description?: string;
    icon?: string;
  }): Promise<{
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
  }> {
    const iconUrl = data.icon ? await uploadImage(data.icon, 'category-icons') : undefined;

    return this.prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        icon: iconUrl,
      },
    });
  }
}
