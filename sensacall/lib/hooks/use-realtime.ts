'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getRealtimeClient } from '../websocket/realtime-client'
import { useChatStore } from '../store/chat-store'
import type { Message as ChatMessage } from '../store/chat-store'
import type { Message as RealtimeMessage } from '../websocket/realtime-client'
import type { RealtimePresenceState } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  conversationId?: string | null
  userId?: string
  enabled?: boolean
}

export function useRealtime({
  conversationId,
  userId,
  enabled = true,
}: UseRealtimeOptions = {}) {
  const realtimeClientRef = useRef(getRealtimeClient())
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const {
    addMessage,
    addTypingUser,
    removeTypingUser,
    setPresenceState,
    setConnected,
    setConnectionStatus,
    isTyping,
    setIsTyping,
  } = useChatStore()

  // Convert realtime message to chat message
  const convertMessage = useCallback((realtimeMessage: RealtimeMessage): ChatMessage => {
    return {
      id: realtimeMessage.id,
      content: realtimeMessage.content,
      role: 'assistant', // Default to assistant for incoming messages
      conversation_id: realtimeMessage.conversation_id,
      created_at: realtimeMessage.created_at,
      updated_at: realtimeMessage.updated_at,
    }
  }, [])

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: RealtimeMessage) => {
      // Convert and add message to store
      const chatMessage = convertMessage(message)
      addMessage(message.conversation_id, chatMessage)
    },
    [addMessage, convertMessage]
  )

  // Handle typing indicators
  const handleTyping = useCallback(
    (indicator: { user_id: string; conversation_id: string; is_typing: boolean }) => {
      if (indicator.user_id === userId) return // Don't show own typing indicator
      
      if (indicator.is_typing) {
        addTypingUser(indicator.conversation_id, indicator.user_id)
        
        // Auto-remove typing indicator after 3 seconds
        setTimeout(() => {
          removeTypingUser(indicator.conversation_id, indicator.user_id)
        }, 3000)
      } else {
        removeTypingUser(indicator.conversation_id, indicator.user_id)
      }
    },
    [userId, addTypingUser, removeTypingUser]
  )

  // Handle presence updates
  const handlePresence = useCallback(
    (state: RealtimePresenceState) => {
      if (conversationId) {
        setPresenceState(conversationId, state)
      }
    },
    [conversationId, setPresenceState]
  )

  // Send typing indicator
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId || !userId) return
      
      realtimeClientRef.current.sendTypingIndicator(
        conversationId,
        userId,
        typing
      )
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set typing state
      if (typing) {
        setIsTyping(true)
        
        // Auto-stop typing after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false)
          realtimeClientRef.current.sendTypingIndicator(
            conversationId,
            userId,
            false
          )
        }, 3000)
      } else {
        setIsTyping(false)
      }
    },
    [conversationId, userId, setIsTyping]
  )

  // Update presence status
  const updatePresence = useCallback(
    (status: 'online' | 'away' | 'offline') => {
      if (!conversationId) return
      
      realtimeClientRef.current.updatePresence(conversationId, status)
    },
    [conversationId]
  )

  // Subscribe to conversation
  useEffect(() => {
    if (!enabled || !conversationId) return
    
    setConnectionStatus('connecting')
    
    const channel = realtimeClientRef.current.subscribeToConversation(
      conversationId,
      handleMessage,
      handleTyping,
      handlePresence
    )
    
    // Update connection status based on channel state
    const checkConnectionStatus = () => {
      if (channel.state === 'joined') {
        setConnected(true)
        setConnectionStatus('connected')
      } else if (channel.state === 'errored') {
        setConnected(false)
        setConnectionStatus('error')
      } else if (channel.state === 'closed') {
        setConnected(false)
        setConnectionStatus('disconnected')
      }
    }
    
    // Check initial status
    checkConnectionStatus()
    
    // Monitor status changes
    const statusInterval = setInterval(checkConnectionStatus, 1000)
    
    return () => {
      clearInterval(statusInterval)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      realtimeClientRef.current.unsubscribeFromConversation(conversationId)
      setConnected(false)
      setConnectionStatus('disconnected')
    }
  }, [
    conversationId,
    enabled,
    handleMessage,
    handleTyping,
    handlePresence,
    setConnected,
    setConnectionStatus,
  ])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away')
      } else {
        updatePresence('online')
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [updatePresence])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return {
    sendTyping,
    updatePresence,
    isTyping,
  }
}
