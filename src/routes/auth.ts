import express from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../index';
import { io } from '../index';

// Define session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

const router = express.Router();

router.get('/login', (_req, res) => {
  res.render('auth/login', { error: null });
});

router.get('/register', (_req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.render('auth/register', { error: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isAdmin: false,
        isApproved: false
      }
    });

    io.to('admin-room').emit('new-user-registration', {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
    
    res.redirect('/auth/login?message=Registration successful. Please wait for admin approval.');
  } catch (error) {
    res.render('auth/register', { error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.render('auth/login', { error: 'Invalid credentials' });
    }
    
    if (!user.isApproved) {
      return res.render('auth/login', { error: 'Account pending approval' });
    }
    
    req.session.userId = user.id;
    
    io.emit('user-logged-in', { userId: user.id });
    
    res.redirect('/dashboard');
  } catch (error) {
    res.render('auth/login', { error: 'Login failed' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

export default router; 