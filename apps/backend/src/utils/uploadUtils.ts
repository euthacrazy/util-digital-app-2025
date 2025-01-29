import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const uploadImage = async (
  base64Image: string,
  folder: string
): Promise<string> => {
  // Remove o prefixo data:image/...;base64,
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Gera um nome único para o arquivo
  const fileName = `${folder}/${uuidv4()}.jpg`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || 'util-digital-uploads',
    Key: fileName,
    Body: buffer,
    ContentType: 'image/jpeg',
    ACL: 'public-read',
  });

  await s3Client.send(command);

  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${fileName}`;
};
