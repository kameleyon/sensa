'use client'

import { useState, useEffect, useRef } from 'react'
import { useRealtime } from '@/lib/hooks/use-realtime'
import { useChatStore } from '@/lib/store/chat-store'
import { useMessages, useSendMessage } from '@/lib/hooks/use-conversations'

interface ChatInterfaceProps {
  conversationId: string
  userId: string
}

export function ChatInterface({ conversationId, userId }: ChatInterfaceProps) {
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { 
    messages: storeMessages,
    typingUsers,
    connectionStatus,
    isConnected,
  } = useChatStore()
  
  const { data: messagesData, isLoading } = useMessages(conversationId)
  const sendMessageMutation = useSendMessage()
  const { sendTyping, isTyping } = useRealtime({ conversationId, userId })
  
  // Get messages for this conversation
  const messages = storeMessages.get(conversationId) || messagesData || []
  const typingUsersInConvo = typingUsers.get(conversationId) || []
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [message])
  
  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Send typing indicator
    if (e.target.value.length > 0 && !isTyping) {
      sendTyping(true)
    } else if (e.target.value.length === 0 && isTyping) {
      sendTyping(false)
    }
  }
  
  // Handle message send
  const handleSend = async () => {
    if (!message.trim()) return
    
    // Stop typing indicator
    sendTyping(false)
    
    // Send message
    await sendMessageMutation.mutateAsync({
      content: message.trim(),
      conversation_id: conversationId,
      role: 'user',
    })
    
    // Clear input
    setMessage('')
    inputRef.current?.focus()
  }
  
  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-neutral-light">
        <h2 className="text-lg font-heading font-semibold text-primary">Chat</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          } animate-pulse-soft`} />
          <span className="text-sm text-neutral">
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
            {connectionStatus === 'error' && 'Connection Error'}
          </span>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral">
            <p className="font-body">Start a conversation...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-neutral-light'
                }`}
              >
                <p className="font-body whitespace-pre-wrap break-words">{msg.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {new Date(msg.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicators */}
        {typingUsersInConvo.length > 0 && (
          <div className="flex items-center gap-2 text-neutral animate-fade-in">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-neutral rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-neutral rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-neutral rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-sm font-body">Someone is typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t border-neutral-light bg-white/80 backdrop-blur-sm p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-xl border border-neutral-light bg-white/50 px-4 py-2 font-body focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-primary-light max-h-32"
            rows={1}
            disabled={!isConnected || sendMessageMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || !isConnected || sendMessageMutation.isPending}
            className="px-6 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl font-heading font-medium hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
