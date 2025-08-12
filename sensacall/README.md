# SensaCall - Real-time AI Companion Chat

A modern, real-time chat application built with Next.js 14, TypeScript, Supabase Realtime, and WebSocket technology for instant, smooth message delivery.

## Features

- **Real-time Messaging**: Instant message delivery using Supabase Realtime
- **Typing Indicators**: See when others are typing in real-time
- **Online Presence**: Track user online/offline status
- **AI Personalities**: Multiple AI companion personalities to choose from
- **Optimized Performance**: Built with React Query for efficient data fetching
- **State Management**: Zustand for lightweight, performant state management
- **Beautiful UI**: Custom Tailwind CSS design with glassmorphic elements
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom configuration
- **Real-time**: Supabase Realtime WebSockets
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)

## Project Structure

```
sensacall/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page
├── components/            # React components
│   └── chat/             # Chat-related components
├── lib/                   # Core libraries and utilities
│   ├── supabase/         # Supabase client configuration
│   ├── websocket/        # WebSocket/Realtime handlers
│   ├── store/            # Zustand store
│   ├── hooks/            # Custom React hooks
│   └── providers/        # React providers
├── public/               # Static assets
├── .env.local            # Environment variables
├── tailwind.config.js    # Tailwind configuration
├── next.config.ts        # Next.js configuration
└── package.json          # Dependencies and scripts
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.local` file and update with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# OpenRouter API (for AI responses)
OPENROUTER_API_KEY=your_openrouter_api_key

# WebSocket Configuration (optional, for custom WebSocket server)
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 3. Set up Supabase Database

Create the following tables in your Supabase project:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_personality TEXT DEFAULT 'friendly',
  title TEXT,
  last_message TEXT,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')),
  metadata JSONB,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in own conversations" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Key Features Implementation

### Real-time WebSocket Connection

The application uses Supabase Realtime for WebSocket connections, providing:

- **Automatic reconnection** with exponential backoff
- **Connection state monitoring** with visual indicators
- **Presence tracking** for online/offline status
- **Typing indicators** with automatic timeout
- **Message synchronization** across all connected clients

### State Management

Zustand store manages:
- User authentication state
- Conversations and messages
- Typing indicators
- Connection status
- UI state (sidebar, loading, errors)

### Performance Optimizations

- **React Query** for intelligent data caching and synchronization
- **Optimistic updates** for instant UI feedback
- **Message batching** for reduced network overhead
- **Lazy loading** of conversations and messages
- **Code splitting** with Next.js dynamic imports

## Development Tips

1. **Testing Real-time Features**: Open multiple browser tabs to test real-time messaging and typing indicators

2. **Monitoring WebSocket Connection**: Check the connection status indicator in the chat interface

3. **Debugging**: Use React Query DevTools (available in development) to inspect cache and queries

4. **Performance**: Use Chrome DevTools Performance tab to monitor real-time performance

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your production environment:
- Update `NEXT_PUBLIC_SUPABASE_URL` with your production Supabase URL
- Update API keys with production keys
- Set proper CORS origins in middleware.ts

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.