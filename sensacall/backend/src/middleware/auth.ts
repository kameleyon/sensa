import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabase } from '../lib/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscription_tier: 'free' | 'plus' | 'pro';
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    // Fetch user profile from Supabase
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, subscription_tier')
      .eq('id', decoded.userId)
      .single();

    if (error || !profile) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      subscription_tier: profile.subscription_tier,
    };

    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireSubscription = (
  minTier: 'free' | 'plus' | 'pro' = 'free'
) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const tierHierarchy = {
      free: 0,
      plus: 1,
      pro: 2,
    };

    const userTierLevel = tierHierarchy[req.user.subscription_tier];
    const requiredTierLevel = tierHierarchy[minTier];

    if (userTierLevel < requiredTierLevel) {
      res.status(403).json({
        error: `This feature requires ${minTier} subscription or higher`,
      });
      return;
    }

    next();
  };
};