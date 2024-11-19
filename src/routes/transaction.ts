import express from 'express';
import { prisma } from '../index';
import { isAuthenticated } from '../middleware/auth';
import { io } from '../index';

// Define custom request type with user property
interface AuthRequest extends express.Request {
  user?: {
    id: string;
    balance: number;
  };
}

const router = express.Router();

router.use(isAuthenticated);

router.post('/transfer', async (req: AuthRequest, res) => {
  const { recipientPublicId, amount, description } = req.body;
  
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const recipient = await prisma.user.findUnique({
      where: { publicId: recipientPublicId }
    });
    
    if (!recipient) {
      return res.status(400).json({ error: 'Recipient not found' });
    }
    
    await prisma.$transaction(async (prisma) => {
      const sender = await prisma.user.findUnique({
        where: { id: req.user!.id }
      });
      
      if (!sender || sender.balance < parseFloat(amount)) {
        throw new Error('Insufficient funds');
      }
      
      await prisma.user.update({
        where: { id: sender.id },
        data: { balance: sender.balance - parseFloat(amount) }
      });
      
      await prisma.user.update({
        where: { id: recipient.id },
        data: { balance: recipient.balance + parseFloat(amount) }
      });
      
      await prisma.transaction.create({
        data: {
          amount: parseFloat(amount),
          type: 'TRANSFER',
          senderId: sender.id,
          receiverId: recipient.id,
          description
        }
      });

      io.to(`user-${sender.id}`).emit('balance-update', {
        newBalance: sender.balance - parseFloat(amount),
        transaction: {
          type: 'TRANSFER',
          amount: -parseFloat(amount),
          description
        }
      });

      io.to(`user-${recipient.id}`).emit('balance-update', {
        newBalance: recipient.balance + parseFloat(amount),
        transaction: {
          type: 'TRANSFER',
          amount: parseFloat(amount),
          description
        }
      });
    });
    
    return res.redirect('/dashboard?message=Transfer successful');
  } catch (error) {
    return res.redirect('/dashboard?error=Transfer failed');
  }
});

router.get('/history', async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { senderId: req.user.id },
        { receiverId: req.user.id }
      ]
    },
    include: {
      sender: true,
      receiver: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return res.render('transaction/history', { transactions });
});

export default router; 