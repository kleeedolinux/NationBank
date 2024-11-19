import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../types/AuthRequest';

const isAuthenticated = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId }
    });

    if (!user) {
      return res.redirect('/auth/login');
    }

    req.user = user;
    next();
  } catch (error) {
    res.redirect('/auth/login');
  }
};

const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.redirect('/dashboard');
    }

    next();
  } catch (error) {
    res.redirect('/dashboard');
  }
};

export { isAuthenticated, isAdmin };