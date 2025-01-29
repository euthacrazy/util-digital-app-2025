import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/uploadController';
import { authenticate } from '../middlewares/auth';
import { invalidateCache } from '../middlewares/cache';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const uploadController = new UploadController();

// Upload de imagem (produto, loja, usuário)
router.post(
  '/upload/:type',
  authenticate,
  upload.single('image'),
  invalidateCache(['products:*', 'stores:*', 'users:*']),
  uploadController.uploadImage
);

// Deletar imagem
router.delete(
  '/upload/:type/:id',
  authenticate,
  invalidateCache(['products:*', 'stores:*', 'users:*']),
  uploadController.deleteImage
);

export default router;
