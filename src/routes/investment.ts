import express from 'express';
import { prisma } from '../index';
import { isAuthenticated } from '../middleware/auth';
import { calculateInvestmentReturn } from '../utils/calculations';
import { io } from '../index';

interface AuthRequest extends express.Request {
  user?: {
    id: string;
    balance: number;
  };
}

const router = express.Router();

router.use(isAuthenticated);

router.post('/create', async (req: AuthRequest, res) => {
  const { amount, term } = req.body;
  
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const systemConfig = await prisma.systemConfig.findFirst();
    if (!systemConfig) {
      return res.status(400).json({ error: 'System configuration not found' });
    }

    // Calculate expected return
    const expectedReturn = calculateInvestmentReturn(
      parseFloat(amount),
      systemConfig.cdiRate,
      parseInt(term)
    );

    await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id }
      });
      
      if (!user || user.balance < parseFloat(amount)) {
        throw new Error('Insufficient funds');
      }

      const maturityDate = new Date();
      maturityDate.setDate(maturityDate.getDate() + parseInt(term));
      
      const investment = await prisma.investment.create({
        data: {
          userId: user.id,
          amount: parseFloat(amount),
          rate: systemConfig.cdiRate,
          term: parseInt(term),
          status: 'ACTIVE',
          maturityDate,
          expectedReturn
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { balance: user.balance - parseFloat(amount) }
      });

      // Create transaction record for investment
      await prisma.transaction.create({
        data: {
          amount: parseFloat(amount),
          type: 'INVESTMENT',
          senderId: user.id,
          receiverId: user.id,
          description: `Investment created - Term: ${term} days`
        }
      });

      // Emit socket event for investment creation
      io.to(`user-${user.id}`).emit('investment-created', {
        investment,
        newBalance: user.balance - parseFloat(amount)
      });
    });
    
    return res.redirect('/dashboard?message=Investment created successfully');
  } catch (error) {
    return res.redirect('/dashboard?error=Investment creation failed');
  }
});

// Add route to get user investments
router.get('/list', async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const investments = await prisma.investment.findMany({
      where: {
        userId: req.user.id,
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.render('investment/list', { investments });
  } catch (error) {
    return res.redirect('/dashboard?error=Failed to load investments');
  }
});

export default router; 