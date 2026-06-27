/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({ 
  icon: Icon = Sparkles, 
  title, 
  description, 
  actionText, 
  onAction 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card-bg/60 rounded-[24px] border border-border-color/50 my-4 shadow-sm animate-fade-in">
      {/* Icon Circle */}
      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md border border-border-color mb-4 text-premium-gold">
        <Icon className="w-8 h-8" />
      </div>

      {/* Description */}
      <h4 className="text-base font-display font-semibold text-primary-navy mb-1">{title}</h4>
      <p className="text-sm text-text-secondary max-w-xs mb-5 leading-normal">{description}</p>

      {/* CTA Button */}
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="neu-button px-5 py-2.5 text-sm font-semibold flex items-center space-x-2 text-primary-navy hover:text-premium-gold hover:border-premium-gold/40"
          id="empty-state-cta-btn"
        >
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}
