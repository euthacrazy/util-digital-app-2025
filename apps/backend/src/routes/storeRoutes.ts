import { Router } from 'express';
import { StoreController } from '../controllers/storeController';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router = Router();
const storeController = new StoreController();

// Schemas de validação
const createStoreSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    logo: z.string().optional(),
    banner: z.string().optional(),
  }),
});

const updateStoreSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    logo: z.string().optional(),
    banner: z.string().optional(),
  }),
});

// Rotas públicas
router.get('/', (req, res) => storeController.listStores(req, res));
router.get('/:id', (req, res) => storeController.getStore(req, res));

// Rotas protegidas
router.use(authenticate);
router.post('/', validateRequest(createStoreSchema), (req, res) => storeController.create(req, res));
router.put('/:id', validateRequest(updateStoreSchema), (req, res) => storeController.update(req, res));
router.get('/me/store', (req, res) => storeController.getMyStore(req, res));
router.get('/:id/sales', (req, res) => storeController.getStoreSales(req, res));
router.delete('/:id', (req, res) => storeController.delete(req, res));

export default router;
