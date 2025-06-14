// import dotenv from 'dotenv';
// dotenv.config();

// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import { authenticate } from './middlewares/auth.middleware.js';
// import routes from './routes/index.js';
// import {
//   appErrorHandler,
//   genericErrorHandler,
//   notFound
// } from './middlewares/error.middleware.js';
// import logger, { logStream } from './config/logger.js';

// import morgan from 'morgan';

// const app = express();
// const host = process.env.APP_HOST;
// const port = process.env.APP_PORT;

// app.use(
//   cors({
//     origin: '*',
//     credentials: true,
//   })
// );
// app.use(helmet());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(morgan('combined', { stream: logStream }));
// app.use(authenticate);
// app.use(`/api`, routes());
// app.use(appErrorHandler);
// app.use(genericErrorHandler);
// app.use(notFound);

// app.listen(port, () => {
//   logger.info(`Server started at ${host}:${port}/api/`);
// });

//import paymentRoutes from './routes/payment.route.js';


// export default app;

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import couponRoutes from './routes/coupon.route.js';
import notificationRoutes from './routes/notification.route.js';
import paymentRoutes from './routes/payment.route.js';
import locationRoutes from './routes/locationRoutes.js';


import { authenticate } from './middlewares/auth.middleware.js';
import logger, { logStream } from './config/logger.js';

import {
  appErrorHandler,
  genericErrorHandler,
  notFound
} from './middlewares/error.middleware.js';

// 👇 Import route files directly
import authRoutes from './routes/auth.route.js';
import otherRoutes from './routes/index.js'; // All protected routes here
import router from './routes/auth.route.js';

const app = express();
const host = process.env.APP_HOST || 'http://localhost';
const port = process.env.APP_PORT || 3000;

// Basic middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('combined', { stream: logStream }));

// ✅ Public routes (no token required)
app.use('/api/auth', authRoutes);

// ✅ Authentication middleware (token required from here onwards)
app.use(authenticate);

// ✅ Protected routes (requires token)
app.use('/api', otherRoutes);

// Error handlers
app.use(appErrorHandler);      // Handle custom app errors
app.use(genericErrorHandler); // Handle generic/unexpected errors
app.use(notFound);             // 404 Not Found handler

// Start server
app.listen(port, () => {
  logger.info(`✅ Server started at ${host}:${port}/api/`);
});


app.use('/api/payments', paymentRoutes);

router.use('/coupons', couponRoutes);
router.use('/notifications', notificationRoutes);
app.use('/api/locations', locationRoutes);

export default app;
