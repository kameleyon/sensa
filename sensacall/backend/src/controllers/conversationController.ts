import { Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { incrementUsage } from '../middleware/usageTracker';

const createConversationSchema = z.object({
  agent_id: z.string().uuid(),
  title: z.string().optional(),
});

export class ConversationController {
  async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validation = createConversationSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error.flatten() });
        return;
      }

      const { agent_id, title } = validation.data;

      // Verify agent exists and user has access
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .single();

      if (agentError || !agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      // Check tier requirements
      const tierHierarchy = { free: 0, plus: 1, pro: 2 };
      const userTierLevel = tierHierarchy[req.user!.subscription_tier];
      const requiredTierLevel = tierHierarchy[agent.tier_required as keyof typeof tierHierarchy];

      if (userTierLevel < requiredTierLevel) {
        res.status(403).json({
          error: `This agent requires ${agent.tier_required} subscription or higher`,
        });
        return;
      }

      // Create conversation
      const conversationId = uuidv4();
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          user_id: req.user!.id,
          agent_id,
          title: title || `Chat with ${agent.name}`,
          last_message_at: new Date().toISOString(),
          message_count: 0,
          is_archived: false,
        })
        .select()
        .single();

      if (convError || !conversation) {
        res.status(400).json({ error: 'Failed to create conversation' });
        return;
      }

      // Track usage
      await incrementUsage(req.user!.id, { conversations: 1 });

      res.status(201).json({
        message: 'Conversation created successfully',
        conversation: {
          ...conversation,
          agent,
        },
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { archived, agent_id, limit = 20, offset = 0 } = req.query;

      let query = supabase
        .from('conversations')
        .select(`
          *,
          agents (
            id,
            name,
            avatar_url
          )
        `)
        .eq('user_id', req.user!.id)
        .order('last_message_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (archived !== undefined) {
        query = query.eq('is_archived', archived === 'true');
      }

      if (agent_id) {
        query = query.eq('agent_id', agent_id as string);
      }

      const { data: conversations, error } = await query;

      if (error) {
        res.status(400).json({ error: 'Failed to fetch conversations' });
        return;
      }

      res.json({
        conversations: conversations || [],
        total: conversations?.length || 0,
      });
    } catch (error) {
      console.error('List conversations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          *,
          agents (
            id,
            name,
            description,
            avatar_url,
            personality_traits
          ),
          messages (
            id,
            sender_type,
            content,
            created_at
          )
        `)
        .eq('id', id)
        .eq('user_id', req.user!.id)
        .single();

      if (error || !conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Sort messages by creation time
      if (conversation.messages) {
        conversation.messages.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      res.json({ conversation });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async archiveConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', id)
        .eq('user_id', req.user!.id);

      if (error) {
        res.status(400).json({ error: 'Failed to archive conversation' });
        return;
      }

      res.json({ message: 'Conversation archived successfully' });
    } catch (error) {
      console.error('Archive conversation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Delete messages first (due to foreign key constraint)
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id);

      // Delete conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user!.id);

      if (error) {
        res.status(400).json({ error: 'Failed to delete conversation' });
        return;
      }

      res.json({ message: 'Conversation deleted successfully' });
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const conversationController = new ConversationController();