import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

// Database type definitions
export interface Profile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'plus' | 'pro';
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  personality_traits: Record<string, any>;
  voice_id?: string;
  is_active: boolean;
  tier_required: 'free' | 'plus' | 'pro';
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  agent_id: string;
  title: string;
  last_message_at: string;
  message_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'agent';
  content: string;
  tokens_used?: number;
  credits_used?: number;
  created_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  preferred_agent_id?: string;
  theme: 'light' | 'dark' | 'auto';
  notification_enabled: boolean;
  language: string;
  message_style: 'casual' | 'formal' | 'friendly';
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  date: string;
  messages_sent: number;
  credits_used: number;
  conversations_created: number;
}

export interface SubscriptionHistory {
  id: string;
  user_id: string;
  tier: 'free' | 'plus' | 'pro';
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  payment_method?: string;
  amount?: number;
}