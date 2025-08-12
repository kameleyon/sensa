'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { useChatStore } from '../store/chat-store'
import type { Conversation, Message } from '../store/chat-store'

const supabase = createClient()

// Fetch all conversations for the current user
export function useConversations() {
  const user = useChatStore((state) => state.user)
  
  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      return data as Conversation[]
    },
    enabled: !!user?.id,
  })
}

// Fetch messages for a specific conversation
export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return []
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data as Message[]
    },
    enabled: !!conversationId,
  })
}

// Create a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient()
  const user = useChatStore((state) => state.user)
  const addConversation = useChatStore((state) => state.addConversation)
  
  return useMutation({
    mutationFn: async (data: {
      title: string
      ai_personality: string
    }) => {
      if (!user?.id) throw new Error('User not authenticated')
      
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single()
      
      if (error) throw error
      return conversation as Conversation
    },
    onSuccess: (conversation) => {
      addConversation(conversation)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient()
  const addMessage = useChatStore((state) => state.addMessage)
  
  return useMutation({
    mutationFn: async (data: {
      content: string
      conversation_id: string
      role: 'user' | 'assistant'
    }) => {
      const { data: message, error } = await supabase
        .from('messages')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return message as Message
    },
    onSuccess: (message) => {
      addMessage(message.conversation_id, message)
      queryClient.invalidateQueries({ 
        queryKey: ['messages', message.conversation_id] 
      })
    },
  })
}

// Update a conversation
export function useUpdateConversation() {
  const queryClient = useQueryClient()
  const updateConversation = useChatStore((state) => state.updateConversation)
  
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Conversation>
    }) => {
      const { data, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data as Conversation
    },
    onSuccess: (conversation) => {
      updateConversation(conversation.id, conversation)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// Delete a conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient()
  const deleteConversation = useChatStore((state) => state.deleteConversation)
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      deleteConversation(id)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', id] })
    },
  })
}
