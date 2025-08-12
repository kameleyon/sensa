import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { supabase } from '../lib/supabase';
import { openRouterClient } from '../lib/openrouter';
import { incrementUsage } from '../middleware/usageTracker';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  subscriptionTier?: 'free' | 'plus' | 'pro';
}

export class WebSocketHandler {
  private io: SocketServer;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(io: SocketServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.JWT_SECRET) as {
          userId: string;
          email: string;
        };

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, subscription_tier')
          .eq('id', decoded.userId)
          .single();

        if (!profile) {
          return next(new Error('User not found'));
        }

        socket.userId = profile.id;
        socket.userEmail = profile.email;
        socket.subscriptionTier = profile.subscription_tier;

        // Track user socket
        if (!this.userSockets.has(profile.id)) {
          this.userSockets.set(profile.id, new Set());
        }
        this.userSockets.get(profile.id)!.add(socket.id);

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected`);

      // Join user's personal room
      socket.join(`user:${socket.userId}`);

      // Handle joining conversation rooms
      socket.on('join_conversation', async (conversationId: string) => {
        try {
          // Verify user has access to conversation
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('user_id', socket.userId!)
            .single();

          if (conversation) {
            socket.join(`conversation:${conversationId}`);
            socket.emit('joined_conversation', { conversationId });
          } else {
            socket.emit('error', { message: 'Conversation not found' });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle leaving conversation rooms
      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        socket.emit('left_conversation', { conversationId });
      });

      // Handle sending messages with streaming
      socket.on('send_message', async (data: {
        conversationId: string;
        content: string;
      }) => {
        try {
          const { conversationId, content } = data;

          // Check daily limit
          const today = new Date().toISOString().split('T')[0];
          const { data: usage } = await supabase
            .from('usage_tracking')
            .select('messages_sent')
            .eq('user_id', socket.userId!)
            .eq('date', today)
            .single();

          const tierLimits = {
            free: config.FREE_TIER_DAILY_LIMIT,
            plus: config.PLUS_TIER_DAILY_LIMIT,
            pro: config.PRO_TIER_DAILY_LIMIT,
          };

          const limit = tierLimits[socket.subscriptionTier!];
          if (usage && usage.messages_sent >= limit) {
            socket.emit('error', {
              message: 'Daily message limit reached',
              limit,
              used: usage.messages_sent,
            });
            return;
          }

          // Verify conversation ownership and get agent
          const { data: conversation } = await supabase
            .from('conversations')
            .select(`
              *,
              agents (
                id,
                name,
                personality_traits
              )
            `)
            .eq('id', conversationId)
            .eq('user_id', socket.userId!)
            .single();

          if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          // Save user message
          const userMessageId = uuidv4();
          await supabase.from('messages').insert({
            id: userMessageId,
            conversation_id: conversationId,
            sender_type: 'user',
            content,
            created_at: new Date().toISOString(),
          });

          // Emit user message to conversation room
          this.io.to(`conversation:${conversationId}`).emit('new_message', {
            id: userMessageId,
            conversation_id: conversationId,
            sender_type: 'user',
            content,
            created_at: new Date().toISOString(),
          });

          // Get conversation history
          const { data: messages } = await supabase
            .from('messages')
            .select('sender_type, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(10);

          // Prepare AI messages
          const aiMessages = [
            {
              role: 'system' as const,
              content: openRouterClient.generateSystemPrompt(conversation.agents.personality_traits),
            },
            ...(messages || []).map(msg => ({
              role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
              content: msg.content,
            })),
          ];

          // Create AI message placeholder
          const aiMessageId = uuidv4();
          let aiContent = '';
          let tokensUsed = 0;

          // Emit typing indicator
          socket.emit('agent_typing', { conversationId, isTyping: true });

          // Stream AI response
          await openRouterClient.createStreamingCompletion(
            aiMessages,
            (chunk: string) => {
              aiContent += chunk;
              // Emit chunk to client
              socket.emit('message_chunk', {
                messageId: aiMessageId,
                chunk,
                conversationId,
              });
            },
            {
              temperature: 0.8,
              max_tokens: 1000,
              user: socket.userId,
            }
          );

          // Stop typing indicator
          socket.emit('agent_typing', { conversationId, isTyping: false });

          // Estimate tokens (rough calculation)
          tokensUsed = Math.ceil((aiContent.split(' ').length + content.split(' ').length) * 1.3);

          // Save complete AI message
          await supabase.from('messages').insert({
            id: aiMessageId,
            conversation_id: conversationId,
            sender_type: 'agent',
            content: aiContent,
            tokens_used: tokensUsed,
            credits_used: Math.ceil(tokensUsed / 100),
            created_at: new Date().toISOString(),
          });

          // Emit complete AI message
          this.io.to(`conversation:${conversationId}`).emit('new_message', {
            id: aiMessageId,
            conversation_id: conversationId,
            sender_type: 'agent',
            content: aiContent,
            created_at: new Date().toISOString(),
          });

          // Update conversation
          await supabase
            .from('conversations')
            .update({
              last_message_at: new Date().toISOString(),
              message_count: (conversation.message_count || 0) + 2,
            })
            .eq('id', conversationId);

          // Track usage
          await incrementUsage(socket.userId!, {
            messages: 2,
            credits: Math.ceil(tokensUsed / 100),
          });

        } catch (error) {
          console.error('WebSocket message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          userId: socket.userId,
          isTyping: data.isTyping,
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        
        // Remove socket from tracking
        const userSocketSet = this.userSockets.get(socket.userId!);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(socket.userId!);
          }
        }
      });
    });
  }

  // Send notification to specific user
  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Send notification to conversation participants
  public sendToConversation(conversationId: string, event: string, data: any): void {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

export default WebSocketHandler;