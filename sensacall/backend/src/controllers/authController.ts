import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { config } from '../config';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error.flatten() });
        return;
      }

      const { email, password, username } = validation.data;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      // Hash password (stored in Supabase Auth)
      await bcrypt.hash(password, 10);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        res.status(400).json({ error: 'Failed to create user account' });
        return;
      }

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          username,
          subscription_tier: 'free',
          credits_remaining: 50,
        })
        .select()
        .single();

      if (profileError) {
        res.status(400).json({ error: 'Failed to create user profile' });
        return;
      }

      // Create default user preferences
      await supabase.from('user_preferences').insert({
        user_id: authData.user.id,
        theme: 'dark',
        notification_enabled: true,
        language: 'en',
        message_style: 'friendly',
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: authData.user.id, email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          subscription_tier: profile.subscription_tier,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error.flatten() });
        return;
      }

      const { email, password } = validation.data;

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: authData.user.id, email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          subscription_tier: profile.subscription_tier,
          avatar_url: profile.avatar_url,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      await supabase.auth.signOut();
      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Generate new JWT token
      const token = jwt.sign(
        { userId: data.user!.id, email: data.user!.email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
      );

      res.json({
        token,
        refreshToken: data.session.refresh_token,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }
}

export const authController = new AuthController();