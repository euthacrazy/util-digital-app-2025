import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { uploadToS3 } from '../utils/s3';

const prisma = new PrismaClient();

export class UploadController {
  async uploadImage(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError(400, 'Nenhuma imagem enviada');
    }

    const file = req.file;
    const { type } = req.params; // product, store, user

    // Validar tipo de arquivo
    if (!file.mimetype.startsWith('image/')) {
      throw new AppError(400, 'Arquivo deve ser uma imagem');
    }

    // Gerar nome único para o arquivo
    const fileName = `${type}/${Date.now()}-${file.originalname}`;

    try {
      // Upload para S3
      const url = await uploadToS3(file.buffer, fileName, file.mimetype);

      // Atualizar referência no banco de dados
      switch (type) {
        case 'product': {
          const { productId } = req.body;
          await prisma.product.update({
            where: { id: productId },
            data: {
              images: {
                push: url
              }
            }
          });
          break;
        }
        case 'store': {
          const { field } = req.body; // logo ou banner
          const storeId = req.user?.store?.id;
          
          if (!storeId) {
            throw new AppError(403, 'Não autorizado');
          }

          await prisma.store.update({
            where: { id: storeId },
            data: {
              [field]: url
            }
          });
          break;
        }
        case 'user': {
          const userId = req.user?.id;
          
          if (!userId) {
            throw new AppError(403, 'Não autorizado');
          }

          await prisma.user.update({
            where: { id: userId },
            data: {
              avatar: url
            }
          });
          break;
        }
        default:
          throw new AppError(400, 'Tipo de upload inválido');
      }

      return res.json({ url });
    } catch (error) {
      console.error('Erro no upload:', error);
      throw new AppError(500, 'Erro ao fazer upload da imagem');
    }
  }

  async deleteImage(req: Request, res: Response) {
    const { type, id } = req.params;
    const { url } = req.body;

    try {
      // Remover da S3
      // TODO: Implementar deleteFromS3

      // Atualizar referência no banco de dados
      switch (type) {
        case 'product': {
          await prisma.product.update({
            where: { id },
            data: {
              images: {
                set: prisma.product.findUnique({
                  where: { id }
                }).then(product => 
                  product?.images.filter(image => image !== url) || []
                )
              }
            }
          });
          break;
        }
        case 'store': {
          const { field } = req.body; // logo ou banner
          const storeId = req.user?.store?.id;
          
          if (!storeId || storeId !== id) {
            throw new AppError(403, 'Não autorizado');
          }

          await prisma.store.update({
            where: { id: storeId },
            data: {
              [field]: null
            }
          });
          break;
        }
        case 'user': {
          const userId = req.user?.id;
          
          if (!userId || userId !== id) {
            throw new AppError(403, 'Não autorizado');
          }

          await prisma.user.update({
            where: { id: userId },
            data: {
              avatar: null
            }
          });
          break;
        }
        default:
          throw new AppError(400, 'Tipo de deleção inválido');
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      throw new AppError(500, 'Erro ao deletar imagem');
    }
  }
}
