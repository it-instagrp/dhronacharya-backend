import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticate } from './middlewares/auth.middleware.js';
import routes from './routes/index.js';
import {
  appErrorHandler,
  genericErrorHandler,
  notFound
} from './middlewares/error.middleware.js';
import logger, { logStream } from './config/logger.js';

import morgan from 'morgan';

const app = express();
const host = process.env.APP_HOST;
const port = process.env.APP_PORT;

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('combined', { stream: logStream }));
app.use(authenticate);
app.use(`/api`, routes());
app.use(appErrorHandler);
app.use(genericErrorHandler);
app.use(notFound);

app.listen(port, () => {
  logger.info(`Server started at ${host}:${port}/api/`);
});

export default app;
