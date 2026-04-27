'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface Activation {
  id: string;
  deviceSerial: string;
  tokenType: string;
  timestamp: Date;
}

interface RecentActivationsProps {
  activations: Activation[];
}

export function RecentActivations({ activations }: RecentActivationsProps) {
  return (
    <div className="bg-card border-2 border-foreground rounded-xl p-6 h-full" style={{ boxShadow: '8px 8px 0px 0px #E2E8F0' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-tertiary border-2 border-foreground rounded-full flex items-center justify-center" style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}>
          <Zap size={18} strokeWidth={2.5} className="text-foreground" />
        </div>
        <h3 className="text-lg font-heading font-bold text-foreground uppercase tracking-wide">
          Recent Activations
        </h3>
      </div>
      
      {activations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted border-2 border-foreground rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={24} strokeWidth={2} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            No recent activations
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activations.map((activation, index) => (
            <motion.div
              key={activation.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: index * 0.05,
                duration: 0.3,
                ease: [0.34, 1.56, 0.64, 1]
              }}
              className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <div>
                <div className="text-sm font-bold text-foreground mb-1">
                  {activation.deviceSerial}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {activation.tokenType}
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {formatDistanceToNow(activation.timestamp)}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
