export type ChatMode = 'vent' | 'gossip' | 'coach' | 'solver' | 'hype' | 'advice';

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  specialties: ChatMode[];
  bio: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  agentId?: string;
  mode?: ChatMode;
}

export interface ChatSession {
  id: string;
  agentId: string;
  mode: ChatMode;
  messages: Message[];
  tone: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultMode: ChatMode;
  defaultTone: number;
  favoriteAgents: string[];
}

export interface ChatContextType {
  currentSession: ChatSession | null;
  selectedAgent: Agent | null;
  selectedMode: ChatMode;
  tone: number;
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => void;
  selectAgent: (agent: Agent) => void;
  selectMode: (mode: ChatMode) => void;
  setTone: (tone: number) => void;
  clearChat: () => void;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (name: string, email: string, password: string) => Promise<void>;
}