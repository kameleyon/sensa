'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChatContextType, ChatSession, Agent, ChatMode, Message } from '../types';
import { agents } from '../lib/data/agents';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0]);
  const [selectedMode, setSelectedMode] = useState<ChatMode>('vent');
  const [tone, setTone] = useState(50);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      agentId: selectedAgent?.id,
      mode: selectedMode,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(content, selectedMode, tone, selectedAgent),
        sender: 'ai',
        timestamp: new Date(),
        agentId: selectedAgent?.id,
        mode: selectedMode,
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  }, [selectedAgent, selectedMode, tone]);

  const selectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);

  const selectMode = useCallback((mode: ChatMode) => {
    setSelectedMode(mode);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentSession(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        currentSession,
        selectedAgent,
        selectedMode,
        tone,
        messages,
        isTyping,
        sendMessage,
        selectAgent,
        selectMode,
        setTone,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

function generateAIResponse(
  userMessage: string,
  mode: ChatMode,
  tone: number,
  agent: Agent | null
): string {
  const responses: Record<ChatMode, string[]> = {
    vent: [
      "I hear you, and your feelings are completely valid. Tell me more about what's on your mind.",
      "That sounds really challenging. I'm here to listen without judgment.",
      "It's okay to feel this way. Sometimes we just need to let it all out.",
    ],
    gossip: [
      "OMG, spill the tea! I'm all ears!",
      "No way! Tell me everything! This is getting juicy!",
      "Wait, wait, wait... they did WHAT? I need all the details!",
    ],
    coach: [
      "Let's break this down together. What's the first step you think you could take?",
      "You've got this! What strengths can you leverage here?",
      "Great question! Let's explore your options and find the best path forward.",
    ],
    solver: [
      "Let's analyze this systematically. What are the key factors at play?",
      "I see the challenge. Here are three potential solutions we could explore...",
      "Based on what you've shared, here's a strategic approach to consider...",
    ],
    hype: [
      "YES! You are absolutely CRUSHING IT!",
      "This is YOUR moment! I'm so proud of you!",
      "Look at you go! You're unstoppable! Keep that energy flowing!",
    ],
    advice: [
      "From my perspective, it might help to consider this angle...",
      "In similar situations, I've seen this approach work well...",
      "Here's something to think about that might provide clarity...",
    ],
  };

  const modeResponses = responses[mode];
  const baseResponse = modeResponses[Math.floor(Math.random() * modeResponses.length)];
  
  // Adjust response based on tone (0-100)
  if (tone < 30) {
    return `${baseResponse} (Speaking gently and softly)`;
  } else if (tone > 70) {
    return `${baseResponse} (With lots of energy and enthusiasm!)`;
  }
  
  return baseResponse;
}