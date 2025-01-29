import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { z } from 'zod';

const router = Router();
const userController = new UserController();

// Schemas de validação
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    role: z.enum(['ADMIN', 'VENDOR', 'CUSTOMER']).optional(),
    referredBy: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
  }),
});

// Rotas
router.post('/register', validateRequest(registerSchema), (req, res) => userController.register(req, res));
router.post('/login', validateRequest(loginSchema), (req, res) => userController.login(req, res));
router.get('/profile', authenticate, (req, res) => userController.getProfile(req, res));
router.put('/profile', authenticate, validateRequest(updateProfileSchema), (req, res) => userController.updateProfile(req, res));

export default router;
