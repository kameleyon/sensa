'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, Target, Lightbulb, Zap, HelpCircle } from 'lucide-react';
import { ChatMode } from '../types';
import { useChat } from '../contexts/ChatContext';
import { cn } from '../lib/utils';

const modeConfig: Record<ChatMode, { icon: React.ElementType; label: string; description: string; color: string }> = {
  vent: {
    icon: Heart,
    label: 'Vent',
    description: 'Let it all out',
    color: 'from-pink-500 to-rose-500',
  },
  gossip: {
    icon: MessageSquare,
    label: 'Gossip',
    description: 'Spill the tea',
    color: 'from-purple-500 to-pink-500',
  },
  coach: {
    icon: Target,
    label: 'Coach',
    description: 'Get guidance',
    color: 'from-blue-500 to-cyan-500',
  },
  solver: {
    icon: Lightbulb,
    label: 'Solver',
    description: 'Find solutions',
    color: 'from-green-500 to-emerald-500',
  },
  hype: {
    icon: Zap,
    label: 'Hype',
    description: 'Get pumped up',
    color: 'from-yellow-500 to-orange-500',
  },
  advice: {
    icon: HelpCircle,
    label: 'Advice',
    description: 'Seek wisdom',
    color: 'from-indigo-500 to-purple-500',
  },
};

export const ModeSelector: React.FC = () => {
  const { selectedMode, selectMode } = useChat();

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-lg text-gray-800 dark:text-gray-200">
        Choose Your Vibe
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(Object.entries(modeConfig) as [ChatMode, typeof modeConfig[ChatMode]][]).map(
          ([mode, config], index) => {
            const Icon = config.icon;
            const isActive = selectedMode === mode;

            return (
              <motion.button
                key={mode}
                onClick={() => selectMode(mode)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'mode-card',
                  isActive ? 'mode-card-active' : 'mode-card-inactive'
                )}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div
                    className={cn(
                      'p-3 rounded-xl',
                      isActive
                        ? 'bg-white/20'
                        : `bg-gradient-to-br ${config.color} text-white`
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-heading font-medium">{config.label}</p>
                    <p className="text-xs opacity-75">{config.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          }
        )}
      </div>
    </div>
  );
};