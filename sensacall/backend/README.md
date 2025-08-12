# Sensacall Backend API

AI companion chat application backend built with Node.js, TypeScript, Express, and Supabase.

## Features

- **Authentication**: JWT-based authentication with register, login, and token refresh
- **Real-time Messaging**: WebSocket support for instant messaging and streaming AI responses
- **AI Integration**: OpenRouter API integration with GPT-3.5-turbo model
- **Subscription Tiers**: Free, Plus, and Pro tiers with different message limits
- **Usage Tracking**: Daily message limits and credit tracking
- **Agent System**: Multiple AI personalities with tier-based access
- **User Preferences**: Customizable themes, notification settings, and message styles

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.IO
- **AI**: OpenRouter API
- **Authentication**: JWT + Supabase Auth
- **Validation**: Zod

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (already configured in .env)

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Conversations
- `GET /api/conversations` - List user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation details
- `PATCH /api/conversations/:id/archive` - Archive conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `POST /api/messages/send` - Send message
- `GET /api/messages/conversation/:id` - Get message history
- `DELETE /api/messages/:id` - Delete message

### Agents
- `GET /api/agents` - List available agents
- `GET /api/agents/recommended` - Get recommended agents
- `GET /api/agents/:id` - Get agent details

### User
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update profile
- `GET /api/users/preferences` - Get preferences
- `PATCH /api/users/preferences` - Update preferences
- `GET /api/users/usage` - Get usage statistics
- `GET /api/users/subscription-history` - Get subscription history

## WebSocket Events

### Client Events
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `send_message` - Send message with streaming response
- `typing` - Send typing indicator

### Server Events
- `new_message` - New message received
- `message_chunk` - Streaming message chunk
- `agent_typing` - Agent typing indicator
- `user_typing` - User typing indicator
- `error` - Error message

## Subscription Tiers

- **Free**: 50 messages/day, basic agents
- **Plus**: 500 messages/day, all agents, voice messages
- **Pro**: Unlimited messages, all features, custom agents

## Development

Run in development mode with hot reload:
```bash
npm run dev
```

Run linter:
```bash
npm run lint
```

## Production

Build TypeScript:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Security Features

- JWT authentication
- Rate limiting per endpoint
- Input validation with Zod
- SQL injection prevention via Supabase
- CORS configuration
- Environment variable validation

## Performance Optimization

- Connection pooling
- Response caching strategies
- Efficient database queries
- Message streaming for large responses
- WebSocket connection management

## Error Handling

- Centralized error middleware
- Structured error responses
- Graceful shutdown handling
- Comprehensive logging

## License

ISC