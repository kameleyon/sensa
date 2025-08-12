import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { RealtimePresenceState } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  ai_personality: string
  title: string
  created_at: string
  updated_at: string
  last_message?: string
  unread_count: number
}

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  conversation_id: string
  created_at: string
  updated_at: string
  is_edited?: boolean
  metadata?: Record<string, any>
}

export interface TypingUser {
  user_id: string
  conversation_id: string
  timestamp: number
}

interface ChatState {
  // User state
  user: User | null
  setUser: (user: User | null) => void

  // Conversations state
  conversations: Conversation[]
  activeConversation: Conversation | null
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  deleteConversation: (id: string) => void
  setActiveConversation: (conversation: Conversation | null) => void

  // Messages state
  messages: Map<string, Message[]>
  addMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  deleteMessage: (conversationId: string, messageId: string) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  clearMessages: (conversationId: string) => void

  // Typing indicators
  typingUsers: Map<string, TypingUser[]>
  addTypingUser: (conversationId: string, userId: string) => void
  removeTypingUser: (conversationId: string, userId: string) => void
  clearTypingUsers: (conversationId: string) => void

  // Presence state
  presenceState: Map<string, RealtimePresenceState>
  setPresenceState: (conversationId: string, state: RealtimePresenceState) => void

  // UI state
  isLoading: boolean
  error: string | null
  isSidebarOpen: boolean
  isTyping: boolean
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setIsTyping: (typing: boolean) => void

  // WebSocket connection state
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  setConnected: (connected: boolean) => void
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void

  // Clear all state
  reset: () => void
}

const initialState = {
  user: null,
  conversations: [],
  activeConversation: null,
  messages: new Map(),
  typingUsers: new Map(),
  presenceState: new Map(),
  isLoading: false,
  error: null,
  isSidebarOpen: true,
  isTyping: false,
  isConnected: false,
  connectionStatus: 'disconnected' as const,
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // User actions
        setUser: (user) => set({ user }),

        // Conversation actions
        setConversations: (conversations) => set({ conversations }),
        
        addConversation: (conversation) =>
          set((state) => ({
            conversations: [conversation, ...state.conversations],
          })),
        
        updateConversation: (id, updates) =>
          set((state) => ({
            conversations: state.conversations.map((conv) =>
              conv.id === id ? { ...conv, ...updates } : conv
            ),
            activeConversation:
              state.activeConversation?.id === id
                ? { ...state.activeConversation, ...updates }
                : state.activeConversation,
          })),
        
        deleteConversation: (id) =>
          set((state) => ({
            conversations: state.conversations.filter((conv) => conv.id !== id),
            activeConversation:
              state.activeConversation?.id === id ? null : state.activeConversation,
          })),
        
        setActiveConversation: (conversation) =>
          set({ activeConversation: conversation }),

        // Message actions
        addMessage: (conversationId, message) =>
          set((state) => {
            const messages = new Map(state.messages)
            const conversationMessages = messages.get(conversationId) || []
            messages.set(conversationId, [...conversationMessages, message])
            return { messages }
          }),
        
        updateMessage: (conversationId, messageId, updates) =>
          set((state) => {
            const messages = new Map(state.messages)
            const conversationMessages = messages.get(conversationId) || []
            messages.set(
              conversationId,
              conversationMessages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              )
            )
            return { messages }
          }),
        
        deleteMessage: (conversationId, messageId) =>
          set((state) => {
            const messages = new Map(state.messages)
            const conversationMessages = messages.get(conversationId) || []
            messages.set(
              conversationId,
              conversationMessages.filter((msg) => msg.id !== messageId)
            )
            return { messages }
          }),
        
        setMessages: (conversationId, messages) =>
          set((state) => {
            const messagesMap = new Map(state.messages)
            messagesMap.set(conversationId, messages)
            return { messages: messagesMap }
          }),
        
        clearMessages: (conversationId) =>
          set((state) => {
            const messages = new Map(state.messages)
            messages.delete(conversationId)
            return { messages }
          }),

        // Typing indicators
        addTypingUser: (conversationId, userId) =>
          set((state) => {
            const typingUsers = new Map(state.typingUsers)
            const users = typingUsers.get(conversationId) || []
            const existingUser = users.find((u) => u.user_id === userId)
            
            if (!existingUser) {
              typingUsers.set(conversationId, [
                ...users,
                { user_id: userId, conversation_id: conversationId, timestamp: Date.now() },
              ])
            } else {
              typingUsers.set(
                conversationId,
                users.map((u) =>
                  u.user_id === userId ? { ...u, timestamp: Date.now() } : u
                )
              )
            }
            
            return { typingUsers }
          }),
        
        removeTypingUser: (conversationId, userId) =>
          set((state) => {
            const typingUsers = new Map(state.typingUsers)
            const users = typingUsers.get(conversationId) || []
            typingUsers.set(
              conversationId,
              users.filter((u) => u.user_id !== userId)
            )
            return { typingUsers }
          }),
        
        clearTypingUsers: (conversationId) =>
          set((state) => {
            const typingUsers = new Map(state.typingUsers)
            typingUsers.delete(conversationId)
            return { typingUsers }
          }),

        // Presence state
        setPresenceState: (conversationId, state) =>
          set((prevState) => {
            const presenceState = new Map(prevState.presenceState)
            presenceState.set(conversationId, state)
            return { presenceState }
          }),

        // UI actions
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
        setIsTyping: (isTyping) => set({ isTyping }),

        // WebSocket actions
        setConnected: (isConnected) => set({ isConnected }),
        setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'chat-storage',
        partialize: (state) => ({
          user: state.user,
          conversations: state.conversations,
          isSidebarOpen: state.isSidebarOpen,
        }),
      }
    )
  )
)