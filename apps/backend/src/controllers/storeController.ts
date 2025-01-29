import { Request, Response } from 'express';
import { z } from 'zod';
import { StoreService } from '../services/storeService';
import { AppError } from '../middlewares/errorHandler';

const storeService = new StoreService();

const createStoreSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  logo: z.string().optional(), // Base64 da imagem
  banner: z.string().optional(), // Base64 da imagem
});

const updateStoreSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
});

export class StoreController {
  async create(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const data = createStoreSchema.parse(req.body);

    try {
      const store = await storeService.createStore({
        ...data,
        ownerId: req.user.userId,
      });

      return res.status(201).json(store);
    } catch (error: any) {
      if (error.message === 'User already has a store') {
        throw new AppError(400, 'Usuário já possui uma loja');
      }
      throw error;
    }
  }

  async update(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;
    const data = updateStoreSchema.parse(req.body);

    try {
      const updatedStore = await storeService.updateStore(id, req.user.userId, data);
      return res.json(updatedStore);
    } catch (error: any) {
      if (error.message === 'Store not found') {
        throw new AppError(404, 'Loja não encontrada');
      }
      if (error.message === 'Unauthorized') {
        throw new AppError(403, 'Não autorizado a atualizar esta loja');
      }
      throw error;
    }
  }

  async getMyStore(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    try {
      const store = await storeService.getStoreByOwner(req.user.userId);
      return res.json(store);
    } catch (error: any) {
      if (error.message === 'Store not found') {
        throw new AppError(404, 'Loja não encontrada');
      }
      throw error;
    }
  }

  async getStore(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const store = await storeService.getStore(id);
      return res.json(store);
    } catch (error: any) {
      if (error.message === 'Store not found') {
        throw new AppError(404, 'Loja não encontrada');
      }
      throw error;
    }
  }

  async listStores(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await storeService.getAllStores(page, limit);
    return res.json(result);
  }

  async getStoreSales(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;
    const period = (req.query.period as 'day' | 'week' | 'month') || 'month';

    try {
      const store = await storeService.getStore(id);
      
      if (store.ownerId !== req.user.userId) {
        throw new AppError(403, 'Não autorizado a ver estatísticas desta loja');
      }

      const stats = await storeService.getStoreSales(id, period);
      return res.json(stats);
    } catch (error: any) {
      if (error.message === 'Store not found') {
        throw new AppError(404, 'Loja não encontrada');
      }
      throw error;
    }
  }

  async delete(req: Request, res: Response) {
    if (!req.user) throw new AppError(401, 'Não autorizado');

    const { id } = req.params;

    try {
      const store = await storeService.getStore(id);
      
      if (store.ownerId !== req.user.userId) {
        throw new AppError(403, 'Não autorizado a deletar esta loja');
      }

      // TODO: Implementar lógica de deleção de loja no StoreService
      throw new AppError(501, 'Funcionalidade ainda não implementada');
    } catch (error: any) {
      if (error.message === 'Store not found') {
        throw new AppError(404, 'Loja não encontrada');
      }
      throw error;
    }
  }
}
