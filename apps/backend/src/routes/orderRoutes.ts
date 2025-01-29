import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router = Router();
const orderController = new OrderController();

// Schemas de validação
const createOrderSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number().int().positive()
    })),
    shippingAddress: z.object({
      street: z.string(),
      number: z.string(),
      complement: z.string().optional(),
      neighborhood: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string()
    })
  })
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'PENDING',
      'PAID',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'FAILED'
    ])
  })
});

// Rota pública para webhook do Stripe
router.post('/webhook', (req, res) => orderController.webhook(req, res));

// Rotas protegidas
router.use(authenticate);

// Rotas para clientes
router.get('/', (req, res) => orderController.listOrders(req, res));
router.get('/:id', (req, res) => orderController.getOrder(req, res));

// Rotas para lojas
router.post('/stores/:storeId/orders', validateRequest(createOrderSchema), (req, res) => orderController.create(req, res));
router.get('/stores/:storeId/orders', (req, res) => orderController.listOrders(req, res));
router.put('/stores/:storeId/orders/:id/status', validateRequest(updateStatusSchema), (req, res) => orderController.updateStatus(req, res));

export default router;
