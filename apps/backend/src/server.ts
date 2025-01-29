import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import { routes } from './routes';
import { setupLogger } from './config/logger';

// Carrega variáveis de ambiente
config();

const app = express();
const logger = setupLogger();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por IP
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

// Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Rotas
app.use('/api', routes);

// Tratamento de erros
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
});
