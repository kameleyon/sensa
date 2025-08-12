import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'
import { createClient } from '../supabase/client'

export interface Message {
  id: string
  content: string
  user_id: string
  conversation_id: string
  created_at: string
  updated_at: string
}

export interface TypingIndicator {
  user_id: string
  conversation_id: string
  is_typing: boolean
}

export interface UserPresence {
  user_id: string
  online_at: string
  status: 'online' | 'away' | 'offline'
}

export class RealtimeClient {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  // Message handlers
  private messageHandlers: Map<string, (message: Message) => void> = new Map()
  private typingHandlers: Map<string, (indicator: TypingIndicator) => void> = new Map()
  private presenceHandlers: Map<string, (state: RealtimePresenceState) => void> = new Map()

  constructor() {
    this.setupConnectionMonitoring()
  }

  private setupConnectionMonitoring() {
    // Monitor connection state
    const checkConnection = () => {
      const channels = Array.from(this.channels.values())
      channels.forEach(channel => {
        if (channel.state !== 'joined') {
          this.handleReconnect(channel)
        }
      })
    }

    // Check connection every 30 seconds
    setInterval(checkConnection, 30000)
  }

  private handleReconnect(channel: RealtimeChannel) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Reconnected successfully')
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
        }
      })
    }, this.reconnectDelay)

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
  }

  // Subscribe to conversation messages
  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void,
    onTyping: (indicator: TypingIndicator) => void,
    onPresence: (state: RealtimePresenceState) => void
  ) {
    const channelName = `conversation:${conversationId}`
    
    // Clean up existing channel if it exists
    if (this.channels.has(channelName)) {
      this.unsubscribeFromConversation(conversationId)
    }

    const channel = this.supabase.channel(channelName, {
      config: {
        presence: {
          key: conversationId,
        },
      },
    })

    // Store handlers
    this.messageHandlers.set(conversationId, onMessage)
    this.typingHandlers.set(conversationId, onTyping)
    this.presenceHandlers.set(conversationId, onPresence)

    // Subscribe to new messages
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message)
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        onTyping(payload.payload as TypingIndicator)
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        onPresence(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const state = channel.presenceState()
        onPresence(state)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const state = channel.presenceState()
        onPresence(state)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to conversation ${conversationId}`)
          // Track user presence
          channel.track({
            online_at: new Date().toISOString(),
            status: 'online',
          })
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to conversation ${conversationId}`)
          this.handleReconnect(channel)
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Unsubscribe from conversation
  async unsubscribeFromConversation(conversationId: string) {
    const channelName = `conversation:${conversationId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      await channel.untrack()
      await channel.unsubscribe()
      this.channels.delete(channelName)
      this.messageHandlers.delete(conversationId)
      this.typingHandlers.delete(conversationId)
      this.presenceHandlers.delete(conversationId)
    }
  }

  // Send typing indicator
  async sendTypingIndicator(conversationId: string, userId: string, isTyping: boolean) {
    const channelName = `conversation:${conversationId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: userId,
          conversation_id: conversationId,
          is_typing: isTyping,
        },
      })
    }
  }

  // Update user presence
  async updatePresence(conversationId: string, status: 'online' | 'away' | 'offline') {
    const channelName = `conversation:${conversationId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      await channel.track({
        online_at: new Date().toISOString(),
        status,
      })
    }
  }

  // Get current presence state
  getPresenceState(conversationId: string): RealtimePresenceState | null {
    const channelName = `conversation:${conversationId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      return channel.presenceState()
    }
    return null
  }

  // Clean up all connections
  async cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const unsubscribePromises = Array.from(this.channels.keys()).map(key => {
      const conversationId = key.replace('conversation:', '')
      return this.unsubscribeFromConversation(conversationId)
    })

    await Promise.all(unsubscribePromises)
    this.channels.clear()
    this.messageHandlers.clear()
    this.typingHandlers.clear()
    this.presenceHandlers.clear()
  }
}

// Singleton instance
let realtimeClient: RealtimeClient | null = null

export function getRealtimeClient(): RealtimeClient {
  if (!realtimeClient) {
    realtimeClient = new RealtimeClient()
  }
  return realtimeClient
}
