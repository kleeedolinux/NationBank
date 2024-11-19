import { Request, Response } from 'express';
import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';
import indexRouter from './routes/index';
import authRouter from './routes/auth';
import transactionRouter from './routes/transaction';
import investmentRouter from './routes/investment';
import loanRouter from './routes/loan';
import adminRouter from './routes/admin';
import { AuthRequest } from './types/AuthRequest';
import expressLayouts from 'express-ejs-layouts';
import AddonLoader from './utils/addonLoader';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
export const prisma = new PrismaClient();

// Setup middleware
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false
}));

// Initialize addons
const addonLoader = AddonLoader.getInstance();
addonLoader.loadAddons()
  .then(() => {
    // Load addon middleware and routes
    const addons = addonLoader.getAddons();
    for (const [_, addon] of addons) {
      if (addon.middleware) {
        addon.middleware.forEach(middleware => app.use(middleware));
      }
      if (addon.routes) {
        app.use(`/addon/${addon.name}`, addon.routes);
      }
      if (addon.initialize) {
        addon.initialize();
      }
    }
  })
  .catch(error => {
    console.error('Failed to load addons:', error);
  });

// Route setup
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/transaction', transactionRouter);
app.use('/investment', investmentRouter);
app.use('/loan', loanRouter);
app.use('/admin', adminRouter);

// Error handler
app.use((req: AuthRequest, res: Response) => {
  const systemConfig = { currencySymbol: '$' };
  res.status(404).render('error', {
    user: req.user || null,
    error: 'Page not found',
    systemConfig
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io }; 