import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { supabase } from '../lib/supabase';
import { subscriptionTiers } from '../config';

export const checkDailyLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get or create today's usage record
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

    let currentUsage = usage?.messages_sent || 0;

    if (!usage) {
      // Create new usage record for today
      await supabase.from('usage_tracking').insert({
        user_id: req.user.id,
        date: today,
        messages_sent: 0,
        credits_used: 0,
        conversations_created: 0,
      });
    }

    // Get tier limits
    const tierConfig = Object.values(subscriptionTiers).find(
      tier => tier.name === req.user!.subscription_tier
    );
    
    const dailyLimit = tierConfig?.dailyLimit || subscriptionTiers.FREE.dailyLimit;

    if (currentUsage >= dailyLimit) {
      res.status(429).json({
        error: 'Daily message limit reached',
        limit: dailyLimit,
        used: currentUsage,
        tier: req.user.subscription_tier,
      });
      return;
    }

    // Add usage info to request for later tracking
    (req as any).usageInfo = {
      date: today,
      currentUsage,
      dailyLimit,
    };

    next();
  } catch (error) {
    console.error('Usage tracking error:', error);
    next(); // Continue even if usage tracking fails
  }
};

export const incrementUsage = async (
  userId: string,
  metrics: {
    messages?: number;
    credits?: number;
    conversations?: number;
  }
): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (usage) {
      await supabase
        .from('usage_tracking')
        .update({
          messages_sent: (usage.messages_sent || 0) + (metrics.messages || 0),
          credits_used: (usage.credits_used || 0) + (metrics.credits || 0),
          conversations_created: (usage.conversations_created || 0) + (metrics.conversations || 0),
        })
        .eq('id', usage.id);
    }
  } catch (error) {
    console.error('Failed to increment usage:', error);
  }
};