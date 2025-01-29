import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router = Router();
const productController = new ProductController();

// Schemas de validação
const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string(),
    price: z.number().positive(),
    categoryId: z.string(),
    images: z.array(z.string()).max(5).optional(), // Limitando número máximo de imagens
    attributes: z.record(z.string()).optional()
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    categoryId: z.string().optional(),
    images: z.array(z.string()).optional(),
    attributes: z.record(z.string()).optional()
  }),
});

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    parentId: z.string().optional()
  }),
});

// Rotas públicas
router.get('/', (req, res) => productController.listProducts(req, res));
router.get('/categories', (req, res) => productController.listCategories(req, res));
router.get('/:id', (req, res) => productController.getProduct(req, res));

// Rotas protegidas
router.use(authenticate);
router.post('/', validateRequest(createProductSchema), (req, res) => productController.create(req, res));
router.put('/:id', validateRequest(updateProductSchema), (req, res) => productController.update(req, res));
router.delete('/:id', (req, res) => productController.delete(req, res));
router.post('/categories', validateRequest(createCategorySchema), (req, res) => productController.createCategory(req, res));

export default router;
