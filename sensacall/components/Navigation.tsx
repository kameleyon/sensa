'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Moon, Sun, Menu, X, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

export const Navigation: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card dark:glass-card-dark border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-8 h-8 text-primary" />
            <span className="font-heading font-bold text-xl bg-gradient-to-r from-primary to-primary-lighter bg-clip-text text-transparent">
              SensaCall
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <button className="nav-link">Home</button>
            <button className="nav-link">About</button>
            <button className="nav-link">Features</button>
            <button className="nav-link">Contact</button>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-accent-light" />
                ) : (
                  <Sun className="w-5 h-5 text-accent" />
                )}
              </motion.div>
            </button>

            <button className="hidden md:flex items-center space-x-2 btn-primary">
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={{
          height: isMobileMenuOpen ? 'auto' : 0,
          opacity: isMobileMenuOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="md:hidden overflow-hidden border-t border-white/10"
      >
        <div className="px-4 py-4 space-y-2">
          <button className="w-full text-left nav-link">Home</button>
          <button className="w-full text-left nav-link">About</button>
          <button className="w-full text-left nav-link">Features</button>
          <button className="w-full text-left nav-link">Contact</button>
          <button className="w-full btn-primary mt-4">
            <User className="w-4 h-4 inline mr-2" />
            Sign In
          </button>
        </div>
      </motion.div>
    </motion.nav>
  );
};