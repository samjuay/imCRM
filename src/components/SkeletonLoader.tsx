/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SkeletonLoaderProps {
  type: 'card' | 'list' | 'stats' | 'profile';
  count?: number;
}

export default function SkeletonLoader({ type, count = 3 }: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-28 rounded-[24px] bg-card-bg border border-border-color animate-pulse p-4 flex flex-col justify-between">
            <div className="w-1/2 h-4 bg-border-color rounded-md" />
            <div className="w-12 h-8 bg-border-color rounded-md self-end" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-4">
        {items.map((_, idx) => (
          <div key={idx} className="h-20 rounded-[20px] bg-white border border-border-color animate-pulse p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 w-3/4">
              <div className="w-12 h-12 bg-border-color rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="w-1/2 h-4 bg-border-color rounded-md" />
                <div className="w-1/3 h-3 bg-border-color rounded-md" />
              </div>
            </div>
            <div className="w-16 h-6 bg-border-color rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="space-y-6">
        {items.map((_, idx) => (
          <div key={idx} className="rounded-[24px] bg-white p-5 border border-border-color animate-pulse space-y-3">
            <div className="flex justify-between items-center">
              <div className="w-1/3 h-5 bg-border-color rounded-md" />
              <div className="w-16 h-6 bg-border-color rounded-full" />
            </div>
            <div className="w-full h-12 bg-border-color rounded-lg" />
            <div className="flex justify-between items-center pt-2">
              <div className="w-20 h-4 bg-border-color rounded-md" />
              <div className="w-12 h-6 bg-border-color rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="w-24 h-24 bg-border-color rounded-full mx-auto" />
      <div className="w-1/2 h-6 bg-border-color rounded-md mx-auto" />
      <div className="w-2/3 h-4 bg-border-color rounded-md mx-auto" />
    </div>
  );
}
