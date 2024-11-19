import { User } from '@prisma/client';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare module 'express' {
  interface Request {
    user?: User;
    session: Session & {
      userId?: string;
    };
  }
} 