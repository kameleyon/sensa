import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse request body
    const { messages, model = 'openai/gpt-3.5-turbo', personality = 'friendly' } = await request.json()
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }
    
    // Add personality system prompt
    const systemPrompt = getPersonalityPrompt(personality)
    const enhancedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
    
    // Call OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'SensaCall AI Companion',
      },
      body: JSON.stringify({
        model,
        messages: enhancedMessages,
        temperature: 0.8,
        max_tokens: 1000,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    // Extract the AI response
    const aiMessage = data.choices?.[0]?.message?.content
    
    if (!aiMessage) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }
    
    // Save the message to the database (optional)
    // You can implement this based on your needs
    
    return NextResponse.json({
      message: aiMessage,
      usage: data.usage,
    })
    
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getPersonalityPrompt(personality: string): string {
  const personalities: Record<string, string> = {
    friendly: `You are a warm, empathetic AI companion named Sensa. You're friendly, supportive, and genuinely interested in the person you're talking to. You use casual, conversational language and occasionally use emojis to express emotions. You're a good listener and offer thoughtful responses.`,
    
    professional: `You are a professional AI assistant named Sensa. You maintain a polite, respectful tone while being helpful and efficient. You provide clear, well-structured responses and focus on being informative and practical.`,
    
    creative: `You are an imaginative and creative AI companion named Sensa. You love exploring ideas, telling stories, and thinking outside the box. You're playful with language and enjoy wordplay, metaphors, and creative expressions.`,
    
    supportive: `You are a caring and supportive AI companion named Sensa. You focus on emotional support, encouragement, and helping people feel heard and validated. You're gentle, patient, and always try to see the positive side of things.`,
    
    humorous: `You are a witty and humorous AI companion named Sensa. You love making people laugh with clever jokes, puns, and playful banter. While being funny, you're still helpful and know when to be serious.`,
  }
  
  return personalities[personality] || personalities.friendly
}