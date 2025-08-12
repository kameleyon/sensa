'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useChat } from '../contexts/ChatContext';
import { agents } from '../lib/data/agents';
import { cn } from '../lib/utils';
import Image from 'next/image';

export const AgentSelector: React.FC = () => {
  const { selectedAgent, selectAgent } = useChat();

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-lg text-gray-800 dark:text-gray-200">
        Choose Your Companion
      </h3>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0"
          >
            <button
              onClick={() => selectAgent(agent)}
              className="flex flex-col items-center space-y-2 p-2 rounded-xl hover:bg-white/10 transition-all"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className={cn(
                  'agent-avatar relative overflow-hidden',
                  selectedAgent?.id === agent.id && 'agent-avatar-active'
                )}>
                  <Image
                    src={agent.avatar}
                    alt={agent.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedAgent?.id === agent.id && (
                  <motion.div
                    layoutId="agent-indicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-accent rounded-full"
                  />
                )}
              </motion.div>
              <span
                className={cn(
                  'font-heading font-medium text-sm',
                  selectedAgent?.id === agent.id
                    ? 'text-primary dark:text-primary-lighter'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {agent.name}
              </span>
            </button>
          </motion.div>
        ))}
      </div>
      {selectedAgent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 glass-card dark:glass-card-dark"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {selectedAgent.bio}
          </p>
        </motion.div>
      )}
    </div>
  );
};