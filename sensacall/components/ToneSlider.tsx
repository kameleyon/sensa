'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Volume, Volume1, Volume2 } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';

export const ToneSlider: React.FC = () => {
  const { tone, setTone } = useChat();

  const getToneIcon = () => {
    if (tone < 33) return Volume;
    if (tone < 67) return Volume1;
    return Volume2;
  };

  const getToneLabel = () => {
    if (tone < 20) return 'Gentle';
    if (tone < 40) return 'Calm';
    if (tone < 60) return 'Balanced';
    if (tone < 80) return 'Energetic';
    return 'Excited';
  };

  const getToneColor = () => {
    if (tone < 33) return 'from-blue-400 to-blue-500';
    if (tone < 67) return 'from-primary to-primary-lighter';
    return 'from-accent to-accent-light';
  };

  const Icon = getToneIcon();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg text-gray-800 dark:text-gray-200">
          Set the Tone
        </h3>
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-primary" />
          <span className="font-heading font-medium text-sm">
            {getToneLabel()} ({tone})
          </span>
        </div>
      </div>
      
      <div className="relative">
        <div className="slider-track">
          <motion.div
            className={`slider-fill bg-gradient-to-r ${getToneColor()}`}
            initial={false}
            animate={{ width: `${tone}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        
        <input
          type="range"
          min="0"
          max="100"
          value={tone}
          onChange={(e) => setTone(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label="Tone slider"
        />
        
        <motion.div
          className="slider-thumb absolute top-1/2 transform -translate-y-1/2"
          initial={false}
          animate={{ left: `${tone}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ marginLeft: '-12px' }}
        >
          <motion.div
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className="w-6 h-6 bg-white border-2 border-primary rounded-full shadow-lg"
          />
        </motion.div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Gentle</span>
        <span>Balanced</span>
        <span>Excited</span>
      </div>
    </div>
  );
};