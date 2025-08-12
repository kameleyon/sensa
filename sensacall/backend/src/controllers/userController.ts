import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const updatePreferencesSchema = z.object({
  preferred_agent_id: z.string().uuid().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  notification_enabled: z.boolean().optional(),
  language: z.string().optional(),
  message_style: z.enum(['casual', 'formal', 'friendly']).optional(),
});

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  avatar_url: z.string().url().optional(),
});

export class UserController {
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', req.user!.id)
        .single();

      if (error || !profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      res.json({ profile });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error.flatten() });
        return;
      }

      const updates = {
        ...validation.data,
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', req.user!.id)
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: 'Failed to update profile' });
        return;
      }

      res.json({
        message: 'Profile updated successfully',
        profile,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', req.user!.id)
        .single();

      if (error || !preferences) {
        // Create default preferences if they don't exist
        const defaultPreferences = {
          user_id: req.user!.id,
          theme: 'dark',
          notification_enabled: true,
          language: 'en',
          message_style: 'friendly',
        };

        const { data: newPreferences, error: createError } = await supabase
          .from('user_preferences')
          .insert(defaultPreferences)
          .select()
          .single();

        if (createError) {
          res.status(400).json({ error: 'Failed to create preferences' });
          return;
        }

        res.json({ preferences: newPreferences });
        return;
      }

      res.json({ preferences });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validation = updatePreferencesSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error.flatten() });
        return;
      }

      const updates = {
        ...validation.data,
        updated_at: new Date().toISOString(),
      };

      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', req.user!.id)
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: 'Failed to update preferences' });
        return;
      }

      res.json({
        message: 'Preferences updated successfully',
        preferences,
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUsageStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { start_date, end_date } = req.query;

      let query = supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', req.user!.id)
        .order('date', { ascending: false });

      if (start_date) {
        query = query.gte('date', start_date as string);
      }

      if (end_date) {
        query = query.lte('date', end_date as string);
      } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
      }

      const { data: usage, error } = await query;

      if (error) {
        res.status(400).json({ error: 'Failed to fetch usage stats' });
        return;
      }

      // Calculate totals
      const totals = usage?.reduce(
        (acc, day) => ({
          messages: acc.messages + (day.messages_sent || 0),
          credits: acc.credits + (day.credits_used || 0),
          conversations: acc.conversations + (day.conversations_created || 0),
        }),
        { messages: 0, credits: 0, conversations: 0 }
      ) || { messages: 0, credits: 0, conversations: 0 };

      res.json({
        usage: usage || [],
        totals,
        subscription_tier: req.user!.subscription_tier,
      });
    } catch (error) {
      console.error('Get usage stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSubscriptionHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { data: history, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', req.user!.id)
        .order('started_at', { ascending: false });

      if (error) {
        res.status(400).json({ error: 'Failed to fetch subscription history' });
        return;
      }

      res.json({
        history: history || [],
        current_tier: req.user!.subscription_tier,
      });
    } catch (error) {
      console.error('Get subscription history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const userController = new UserController();