import express from 'express';
import { prisma } from '../index';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { io } from '../index';
import AddonLoader from '../utils/addonLoader';
import { AuthRequest } from '../types/AuthRequest';

const router = express.Router();

router.use(isAuthenticated, isAdmin);

router.get('/dashboard', async (req: AuthRequest, res) => {
  const [pendingUsers, systemConfig, totalMoney] = await Promise.all([
    prisma.user.findMany({ where: { isApproved: false } }),
    prisma.systemConfig.findFirst(),
    prisma.user.aggregate({
      _sum: { balance: true }
    })
  ]);

  const gdp = totalMoney._sum.balance || 0;
  
  res.render('admin/dashboard', {
    user: req.user,
    pendingUsers,
    systemConfig,
    gdp
  });
});

router.post('/approve-user/:id', async (req: AuthRequest, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isApproved: true }
  });
  res.redirect('/admin/dashboard');
});

router.post('/update-config', async (req: AuthRequest, res) => {
  const { currencySymbol, cdiRate, incomeTaxRate } = req.body;
  
  await prisma.systemConfig.upsert({
    where: { id: '1' },
    update: {
      currencySymbol,
      cdiRate: parseFloat(cdiRate),
      incomeTaxRate: parseFloat(incomeTaxRate)
    },
    create: {
      currencySymbol,
      cdiRate: parseFloat(cdiRate),
      incomeTaxRate: parseFloat(incomeTaxRate)
    }
  });
  
  res.redirect('/admin/dashboard');
});

router.post('/transfer', async (req: AuthRequest, res) => {
  const { userId, amount, type } = req.body;
  
  await prisma.$transaction(async (prisma) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    
    const newBalance = type === 'deposit' 
      ? user.balance + parseFloat(amount)
      : user.balance - parseFloat(amount);
    
    await prisma.user.update({
      where: { id: userId },
      data: { balance: newBalance }
    });

    // Calculate new GDP
    const totalMoney = await prisma.user.aggregate({
      _sum: { balance: true }
    });
    
    // Emit GDP update to all admin users
    io.emit('gdp-update', {
      gdp: totalMoney._sum.balance || 0
    });
  });
  
  res.redirect('/admin/dashboard');
});

router.get('/addons', async (req: AuthRequest, res) => {
  const addonLoader = AddonLoader.getInstance();
  const addons = Array.from(addonLoader.getAddons().values());
  
  res.render('admin/addons', {
    user: req.user,
    addons,
    systemConfig: await prisma.systemConfig.findFirst()
  });
});

export default router; 