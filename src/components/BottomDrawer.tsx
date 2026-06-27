/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeightClass?: string;
}

export default function BottomDrawer({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxHeightClass = 'max-h-[90vh]' 
}: BottomDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end overflow-hidden rounded-[40px]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary-navy/40 backdrop-blur-[2px] cursor-pointer"
          />

          {/* Drawer content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`relative w-full ${maxHeightClass} flex flex-col bg-white rounded-t-[32px] shadow-[0_-10px_25px_rgba(11,31,51,0.08)] border-t border-border-color/80 z-10`}
          >
            {/* Grab handle bar */}
            <div className="flex justify-center py-3 cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1.5 bg-border-color rounded-full" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-6 pb-3 border-b border-border-color/50">
              <h3 className="text-lg font-display font-semibold text-primary-navy">{title}</h3>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-input-bg border border-border-color/60 active:scale-90 transition-transform"
                id="drawer-close-btn"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scroll">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
