import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler';

const prisma = new PrismaClient();

const createCategorySchema = z.object({
  name: z.string().min(2),
  parentId: z.string().optional()
});

const updateCategorySchema = createCategorySchema.partial();

export class CategoryController {
  async create(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const data = createCategorySchema.parse(req.body);

    if (data.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId }
      });

      if (!parentCategory) {
        throw new AppError(404, 'Categoria pai não encontrada');
      }
    }

    const category = await prisma.category.create({
      data
    });

    return res.status(201).json(category);
  }

  async update(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;
    const data = updateCategorySchema.parse(req.body);

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      throw new AppError(404, 'Categoria não encontrada');
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data
    });

    return res.json(updatedCategory);
  }

  async getCategory(req: Request, res: Response) {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          take: 10,
          include: {
            store: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!category) {
      throw new AppError(404, 'Categoria não encontrada');
    }

    return res.json(category);
  }

  async listCategories(req: Request, res: Response) {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    return res.json(categories);
  }

  async delete(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!category) {
      throw new AppError(404, 'Categoria não encontrada');
    }

    if (category._count.products > 0) {
      throw new AppError(400, 'Não é possível deletar categoria com produtos');
    }

    await prisma.category.delete({
      where: { id }
    });

    return res.status(204).send();
  }
}
