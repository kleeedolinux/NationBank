import express from 'express';
import { prisma } from '../index';
import { isAuthenticated } from '../middleware/auth';
import { calculateLoanPayment } from '../utils/calculations';
import { io } from '../index';
import { AuthRequest } from '../types/AuthRequest';

const router = express.Router();

router.use(isAuthenticated);

router.post('/apply', async (req: AuthRequest, res) => {
  const { amount, term } = req.body;
  
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const systemConfig = await prisma.systemConfig.findFirst();
    if (!systemConfig) {
      return res.status(400).json({ error: 'System configuration not found' });
    }

    const loan = await prisma.loan.create({
      data: {
        userId: req.user.id,
        amount: parseFloat(amount),
        rate: systemConfig.cdiRate * 2, // Example: Loan rate is 2x CDI rate
        term: parseInt(term),
        status: 'PENDING'
      }
    });

    // Notify admins of new loan application
    io.to('admin-room').emit('new-loan-application', {
      loan,
      userName: req.user.name
    });

    return res.redirect('/dashboard?message=Loan application submitted');
  } catch (error) {
    return res.redirect('/dashboard?error=Loan application failed');
  }
});

router.post('/approve/:id', async (req: AuthRequest, res) => {
  try {
    const loan = await prisma.$transaction(async (prisma) => {
      const loan = await prisma.loan.findUnique({
        where: { id: req.params.id },
        include: { user: true }
      });

      if (!loan) throw new Error('Loan not found');

      // Update loan status
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: 'APPROVED' }
      });

      // Add loan amount to user's balance
      await prisma.user.update({
        where: { id: loan.userId },
        data: { balance: loan.user.balance + loan.amount }
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          amount: loan.amount,
          type: 'LOAN',
          senderId: loan.userId,
          receiverId: loan.userId,
          description: `Loan approved - Term: ${loan.term} months`
        }
      });

      return loan;
    });

    // Notify user of loan approval
    io.to(`user-${loan.userId}`).emit('loan-approved', {
      loanId: loan.id,
      amount: loan.amount
    });

    res.redirect('/admin/dashboard');
  } catch (error) {
    res.redirect('/admin/dashboard?error=Loan approval failed');
  }
});

export default router; 