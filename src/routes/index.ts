import express from 'express';
import { prisma } from '../index';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { AuthRequest } from '../types/AuthRequest';
import { calculateInflation } from '../utils/calculations';
import { getBankConfig } from '../utils/bankConfig';

const router = express.Router();

// Public routes
router.get('/', async (req: AuthRequest, res) => {
  try {
    const [systemConfig, bankConfig] = await Promise.all([
      prisma.systemConfig.findFirst(),
      getBankConfig()
    ]);
    res.render('index', { 
      user: req.user, 
      systemConfig,
      bankConfig,
      error: req.query.error,
      message: req.query.message
    });
  } catch (error) {
    res.render('index', { 
      user: null, 
      systemConfig: { currencySymbol: '$' },
      bankConfig: { bankName: 'Personal Bank' },
      error: 'System error'
    });
  }
});

// User dashboard
router.get('/dashboard', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const [systemConfig, transactions] = await Promise.all([
      prisma.systemConfig.findFirst(),
      prisma.transaction.findMany({
        where: {
          OR: [
            { senderId: req.user!.id },
            { receiverId: req.user!.id }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    res.render('dashboard', {
      user: req.user,
      systemConfig,
      transactions,
      error: req.query.error,
      message: req.query.message
    });
  } catch (error) {
    res.redirect('/?error=Failed to load dashboard');
  }
});

// Transaction history
router.get('/transaction/history', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const [systemConfig, transactions] = await Promise.all([
      prisma.systemConfig.findFirst(),
      prisma.transaction.findMany({
        where: {
          OR: [
            { senderId: req.user!.id },
            { receiverId: req.user!.id }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.render('transaction/history', {
      user: req.user,
      systemConfig,
      transactions
    });
  } catch (error) {
    res.redirect('/dashboard?error=Failed to load transaction history');
  }
});

// Admin dashboard
router.get('/admin/dashboard', isAuthenticated, isAdmin, async (req: AuthRequest, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [pendingUsers, pendingLoans, systemConfig, currentGDP, previousGDP, bankConfig] = await Promise.all([
      prisma.user.findMany({
        where: { isApproved: false }
      }),
      prisma.loan.findMany({
        where: { status: 'PENDING' },
        include: { user: true }
      }),
      prisma.systemConfig.findFirst(),
      prisma.user.aggregate({
        _sum: { balance: true }
      }),
      prisma.transaction.aggregate({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          }
        },
        _sum: {
          amount: true
        }
      }),
      getBankConfig()
    ]);

    const gdp = currentGDP._sum.balance || 0;
    const previousGDPValue = previousGDP._sum.amount || gdp;
    const inflationRate = calculateInflation(previousGDPValue, gdp);

    res.render('admin/dashboard', {
      user: req.user,
      systemConfig,
      pendingUsers,
      pendingLoans,
      gdp,
      calculateInflation: () => inflationRate,
      error: req.query.error,
      message: req.query.message,
      bankConfig
    });
  } catch (error) {
    res.redirect('/dashboard?error=Failed to load admin dashboard');
  }
});

// Investment routes
router.get('/investment/list', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const [investments, systemConfig] = await Promise.all([
      prisma.investment.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.systemConfig.findFirst()
    ]);

    res.render('investment/list', {
      user: req.user,
      systemConfig,
      investments
    });
  } catch (error) {
    res.redirect('/dashboard?error=Failed to load investments');
  }
});

// Loan routes
router.get('/loan/list', isAuthenticated, async (req: AuthRequest, res) => {
  try {
    const [loans, systemConfig] = await Promise.all([
      prisma.loan.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.systemConfig.findFirst()
    ]);

    res.render('loan/list', {
      user: req.user,
      systemConfig,
      loans
    });
  } catch (error) {
    res.redirect('/dashboard?error=Failed to load loans');
  }
});

export default router; 