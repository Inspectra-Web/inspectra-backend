import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { envConfig } from './configuration/environmentConfig.js';
import morgan from 'morgan';
import userRoute from './routes/userRoutes.js';
import AppError from './utils/appError.js';
import globalErrorHandler from './controller/errorController.js';
import cookieParser from 'cookie-parser';
import profileRoute from './routes/profileRoutes.js';
import propertyRoute from './routes/propertyRoutes.js';
import adminRoute from './routes/adminRoutes.js';
import inquiryRoute from './routes/inquiryRoutes.js';
import scheduleRoute from './routes/scheduleRoutes.js';
import chatRoute from './routes/chatRoomRoutes.js';
import messageRoute from './routes/messageRoutes.js';
import planRoute from './routes/planRoutes.js';
import subscriptionRoute from './routes/subscriptionRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const appConfig = app => {
  app.set('view engine', 'pug');
  app.set('views', join(__dirname, './views'));

  app.use(express.json());
  app.use(cookieParser());
  app.use(helmet());

  app.use(
    cors({ origin: ['http://localhost:5173', 'http://localhost:5174', '*'], credentials: true })
  );

  if (envConfig.NODE_ENV === 'development') app.use(morgan('dev'));

  app.get('/', (req, res) => res.status(200).json({ message: 'Welcome to Inspectra Server' }));

  app.use('/api/v1/users', userRoute);
  app.use('/api/v1/admin', adminRoute);
  app.use('/api/v1/profile', profileRoute);
  app.use('/api/v1/property', propertyRoute);
  app.use('/api/v1/inquiry', inquiryRoute);
  app.use('/api/v1/schedule', scheduleRoute);
  app.use('/api/v1/chat', chatRoute);
  app.use('/api/v1/message', messageRoute);
  app.use('/api/v1/plan', planRoute);
  app.use('/api/v1/subscription', subscriptionRoute);

  app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });

  app.use(globalErrorHandler);
};
