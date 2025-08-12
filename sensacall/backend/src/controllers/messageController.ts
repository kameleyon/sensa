import { Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { openRouterClient } from '../lib/openrouter';
import { incrementUsage } from '../middleware/usageTracker';

const sendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export class MessageController {
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validation = sendMessageSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error.flatten() });
        return;
      }

      const { conversation_id, content } = validation.data;

      // Verify conversation ownership
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          agents (
            id,
            name,
            personality_traits
          )
        `)
        .eq('id', conversation_id)
        .eq('user_id', req.user!.id)
        .single();

      if (convError || !conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Save user message
      const userMessageId = uuidv4();
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({
          id: userMessageId,
          conversation_id,
          sender_type: 'user',
          content,
          created_at: new Date().toISOString(),
        });

      if (userMsgError) {
        res.status(400).json({ error: 'Failed to save message' });
        return;
      }

      // Get conversation history for context
      const { data: messages } = await supabase
        .from('messages')
        .select('sender_type, content')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })
        .limit(10);

      // Prepare messages for AI
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

      // Generate AI response
      const aiResponse = await openRouterClient.createChatCompletion(aiMessages, {
        temperature: 0.8,
        max_tokens: 1000,
        user: req.user!.id,
      });

      const aiContent = aiResponse.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';
      const tokensUsed = aiResponse.usage?.total_tokens || 0;

      // Save AI message
      const aiMessageId = uuidv4();
      const { data: aiMessage, error: aiMsgError } = await supabase
        .from('messages')
        .insert({
          id: aiMessageId,
          conversation_id,
          sender_type: 'agent',
          content: aiContent,
          tokens_used: tokensUsed,
          credits_used: Math.ceil(tokensUsed / 100), // 1 credit per 100 tokens
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (aiMsgError) {
        res.status(400).json({ error: 'Failed to save AI response' });
        return;
      }

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: (conversation.message_count || 0) + 2,
        })
        .eq('id', conversation_id);

      // Track usage
      await incrementUsage(req.user!.id, {
        messages: 2,
        credits: Math.ceil(tokensUsed / 100),
      });

      res.json({
        userMessage: {
          id: userMessageId,
          content,
          sender_type: 'user',
          created_at: new Date().toISOString(),
        },
        aiMessage: aiMessage,
        tokensUsed,
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMessageHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversation_id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Verify conversation ownership
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversation_id)
        .eq('user_id', req.user!.id)
        .single();

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Get messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) {
        res.status(400).json({ error: 'Failed to fetch messages' });
        return;
      }

      res.json({
        messages: (messages || []).reverse(), // Return in chronological order
        total: messages?.length || 0,
      });
    } catch (error) {
      console.error('Get message history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verify message ownership through conversation
      const { data: message } = await supabase
        .from('messages')
        .select(`
          id,
          conversations!inner (
            user_id
          )
        `)
        .eq('id', id)
        .single();

      if (!message || message.conversations[0].user_id !== req.user!.id) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) {
        res.status(400).json({ error: 'Failed to delete message' });
        return;
      }

      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const messageController = new MessageController();