import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const useSupabase = process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes('placeholder');
    
    if (useSupabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      req.user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'passenger',
      };
    } else {
      if (token.startsWith('dev-token-')) {
        const userId = token.replace('dev-token-', '');
        req.user = {
          id: userId,
          email: `user-${userId}@example.com`,
          role: 'passenger',
        };
      } else {
        return res.status(401).json({ error: 'Invalid token format' });
      }
    }
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }
  
  requireAuth(req, res, next);
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role || '')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
