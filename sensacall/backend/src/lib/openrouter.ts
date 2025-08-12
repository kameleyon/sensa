import axios from 'axios';
import { config } from '../config';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private model: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = config.OPENROUTER_API_KEY;
    this.model = config.OPENROUTER_MODEL;
  }

  async createChatCompletion(
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
      user?: string;
    } = {}
  ): Promise<OpenRouterResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: options.stream || false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://sensacall.com',
            'X-Title': 'Sensacall AI Companion',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async createStreamingCompletion(
    messages: OpenRouterMessage[],
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      max_tokens?: number;
      user?: string;
    } = {}
  ): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://sensacall.com',
            'X-Title': 'Sensacall AI Companion',
          },
          responseType: 'stream',
        }
      );

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      });

      return new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      throw new Error('Failed to generate streaming AI response');
    }
  }

  generateSystemPrompt(agentPersonality: Record<string, any>): string {
    const traits = Object.entries(agentPersonality)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return `You are an AI companion with the following personality traits: ${traits}. 
    Engage in natural, helpful conversation while maintaining your personality. 
    Be supportive, understanding, and engaging.`;
  }
}

export const openRouterClient = new OpenRouterClient();