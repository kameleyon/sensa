import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

export class AgentController {
  async listAgents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { active } = req.query;

      let query = supabase
        .from('agents')
        .select('*')
        .order('name', { ascending: true });

      if (active !== undefined) {
        query = query.eq('is_active', active === 'true');
      }

      // Filter by tier accessibility
      const tierHierarchy = { free: 0, plus: 1, pro: 2 };
      const userTierLevel = tierHierarchy[req.user!.subscription_tier];
      
      const { data: agents, error } = await query;

      if (error) {
        res.status(400).json({ error: 'Failed to fetch agents' });
        return;
      }

      // Filter agents based on user's subscription tier
      const accessibleAgents = agents?.filter(agent => {
        const requiredTierLevel = tierHierarchy[agent.tier_required as keyof typeof tierHierarchy];
        return userTierLevel >= requiredTierLevel;
      }) || [];

      res.json({
        agents: accessibleAgents,
        total: accessibleAgents.length,
        userTier: req.user!.subscription_tier,
      });
    } catch (error) {
      console.error('List agents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAgent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      // Check if user has access to this agent
      const tierHierarchy = { free: 0, plus: 1, pro: 2 };
      const userTierLevel = tierHierarchy[req.user!.subscription_tier];
      const requiredTierLevel = tierHierarchy[agent.tier_required as keyof typeof tierHierarchy];

      if (userTierLevel < requiredTierLevel) {
        res.status(403).json({
          error: `This agent requires ${agent.tier_required} subscription or higher`,
          agent: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            avatar_url: agent.avatar_url,
            tier_required: agent.tier_required,
          },
        });
        return;
      }

      res.json({ agent });
    } catch (error) {
      console.error('Get agent error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getRecommendedAgents(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Get user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('preferred_agent_id, message_style')
        .eq('user_id', req.user!.id)
        .single();

      // Get user's conversation history to find frequently used agents
      const { data: conversations } = await supabase
        .from('conversations')
        .select('agent_id')
        .eq('user_id', req.user!.id)
        .order('last_message_at', { ascending: false })
        .limit(10);

      // Count agent usage frequency
      const agentFrequency = new Map<string, number>();
      conversations?.forEach(conv => {
        const count = agentFrequency.get(conv.agent_id) || 0;
        agentFrequency.set(conv.agent_id, count + 1);
      });

      // Get all accessible agents
      const tierHierarchy = { free: 0, plus: 1, pro: 2 };
      const userTierLevel = tierHierarchy[req.user!.subscription_tier];

      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true);

      const accessibleAgents = agents?.filter(agent => {
        const requiredTierLevel = tierHierarchy[agent.tier_required as keyof typeof tierHierarchy];
        return userTierLevel >= requiredTierLevel;
      }) || [];

      // Score and sort agents
      const scoredAgents = accessibleAgents.map(agent => {
        let score = 0;

        // Preferred agent gets highest score
        if (preferences?.preferred_agent_id === agent.id) {
          score += 100;
        }

        // Frequently used agents get higher scores
        const frequency = agentFrequency.get(agent.id) || 0;
        score += frequency * 10;

        // Match personality traits with user's message style
        if (preferences?.message_style && agent.personality_traits) {
          const traits = agent.personality_traits as any;
          if (preferences.message_style === 'casual' && traits.casual) score += 5;
          if (preferences.message_style === 'formal' && traits.professional) score += 5;
          if (preferences.message_style === 'friendly' && traits.friendly) score += 5;
        }

        return { ...agent, score };
      });

      // Sort by score and return top recommendations
      scoredAgents.sort((a, b) => b.score - a.score);
      const recommendations = scoredAgents.slice(0, 5);

      res.json({
        recommendations: recommendations.map(({ score, ...agent }) => agent),
        basedOn: {
          preferredAgent: preferences?.preferred_agent_id,
          messageStyle: preferences?.message_style,
          recentConversations: conversations?.length || 0,
        },
      });
    } catch (error) {
      console.error('Get recommended agents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const agentController = new AgentController();