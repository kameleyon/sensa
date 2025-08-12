import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().default('openai/gpt-3.5-turbo'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  FREE_TIER_DAILY_LIMIT: z.string().transform(Number).default('50'),
  PLUS_TIER_DAILY_LIMIT: z.string().transform(Number).default('500'),
  PRO_TIER_DAILY_LIMIT: z.string().transform(Number).default('10000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;

export const subscriptionTiers = {
  FREE: {
    name: 'free',
    dailyLimit: config.FREE_TIER_DAILY_LIMIT,
    features: ['basic_chat', 'limited_agents'],
  },
  PLUS: {
    name: 'plus',
    dailyLimit: config.PLUS_TIER_DAILY_LIMIT,
    features: ['advanced_chat', 'all_agents', 'voice_messages'],
  },
  PRO: {
    name: 'pro',
    dailyLimit: config.PRO_TIER_DAILY_LIMIT,
    features: ['unlimited_chat', 'all_agents', 'voice_messages', 'custom_agents'],
  },
} as const;