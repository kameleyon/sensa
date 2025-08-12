import React from 'react';
import { motion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import { Navigation } from './components/Navigation';
import { ChatInterface } from './components/ChatInterface';
import { ModeSelector } from './components/ModeSelector';
import { AgentSelector } from './components/AgentSelector';
import { ToneSlider } from './components/ToneSlider';

function App() {
  return (
    <ThemeProvider>
      <ChatProvider>
        <div className="min-h-screen bg-gradient-to-br from-neutral-light via-white to-primary/5 dark:from-gray-900 dark:via-gray-800 dark:to-primary/10 transition-colors">
          {/* Floating gradient orbs for background effect */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="floating-gradient absolute top-20 left-20 w-96 h-96 animate-float" />
            <div className="floating-gradient absolute bottom-20 right-20 w-96 h-96 animate-float" style={{ animationDelay: '2s' }} />
            <div className="floating-gradient absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 animate-float" style={{ animationDelay: '4s' }} />
          </div>

          <Navigation />

          <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Left Sidebar - Settings */}
                <div className="lg:col-span-1 space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card dark:glass-card-dark p-6 glass-shimmer"
                  >
                    <AgentSelector />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card dark:glass-card-dark p-6"
                  >
                    <ModeSelector />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card dark:glass-card-dark p-6"
                  >
                    <ToneSlider />
                  </motion.div>
                </div>

                {/* Main Chat Area */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-2"
                >
                  <div className="glass-card dark:glass-card-dark h-[600px] lg:h-[700px] overflow-hidden">
                    <ChatInterface />
                  </div>
                </motion.div>
              </motion.div>

              {/* Features Section */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12 text-center"
              >
                <h2 className="font-heading font-bold text-3xl mb-4 bg-gradient-to-r from-primary to-primary-lighter bg-clip-text text-transparent">
                  Your AI Companion, Always Here
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Whether you need to vent, seek advice, or just chat about life, 
                  SensaCall provides a warm, judgment-free space with AI companions 
                  who truly understand you.
                </p>
              </motion.div>
            </div>
          </main>
        </div>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;