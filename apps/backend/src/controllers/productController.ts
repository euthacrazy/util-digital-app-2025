import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middlewares/errorHandler';
import { ProductService } from '../services/productService';

const productService = new ProductService();

const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string(),
  price: z.number().positive(),
  categoryId: z.string(),
  images: z.array(z.string()).optional(), // Base64 das imagens
  attributes: z.record(z.string()).optional()
});

const updateProductSchema = createProductSchema.partial();

export class ProductController {
  async create(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const data = createProductSchema.parse(req.body);

    try {
      const store = await productService.getStoreByOwner(req.user.userId);
      const product = await productService.createProduct({
        ...data,
        storeId: store.id,
        images: data.images || [],
      });

      return res.status(201).json(product);
    } catch (error: any) {
      if (error.message === 'Store not found') {
        throw new AppError(404, 'Loja não encontrada');
      }
      if (error.message === 'Category not found') {
        throw new AppError(404, 'Categoria não encontrada');
      }
      throw error;
    }
  }

  async update(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;
    const data = updateProductSchema.parse(req.body);

    try {
      const store = await productService.getStoreByOwner(req.user.userId);
      const updatedProduct = await productService.updateProduct(id, store.id, data);
      return res.json(updatedProduct);
    } catch (error: any) {
      if (error.message === 'Product not found') {
        throw new AppError(404, 'Produto não encontrado');
      }
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Não autorizado a atualizar este produto');
      }
      throw error;
    }
  }

  async getProduct(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const product = await productService.getProduct(id);
      return res.json(product);
    } catch (error: any) {
      if (error.message === 'Product not found') {
        throw new AppError(404, 'Produto não encontrado');
      }
      throw error;
    }
  }

  async listProducts(req: Request, res: Response) {
    const { 
      page = 1, 
      limit = 10,
      categoryId,
      storeId,
      search
    } = req.query;

    if (search) {
      const result = await productService.searchProducts(
        String(search),
        categoryId ? String(categoryId) : undefined,
        Number(page),
        Number(limit)
      );
      return res.json(result);
    }

    if (storeId) {
      const result = await productService.getStoreProducts(
        String(storeId),
        Number(page),
        Number(limit),
        categoryId ? String(categoryId) : undefined
      );
      return res.json(result);
    }

    throw new AppError(400, 'Parâmetro storeId ou search é obrigatório');
  }

  async delete(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;

    try {
      const store = await productService.getStoreByOwner(req.user.userId);
      await productService.deleteProduct(id, store.id);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Product not found') {
        throw new AppError(404, 'Produto não encontrado');
      }
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Não autorizado a deletar este produto');
      }
      throw error;
    }
  }

  async listCategories(req: Request, res: Response) {
    const categories = await productService.getCategories();
    return res.json(categories);
  }

  async createCategory(req: Request, res: Response) {
    if (!req.user?.isAdmin) throw new AppError(403, 'Apenas administradores podem criar categorias');

    const categorySchema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      icon: z.string().optional(), // Base64 do ícone
    });

    const data = categorySchema.parse(req.body);
    const category = await productService.createCategory(data);
    return res.status(201).json(category);
  }
}
