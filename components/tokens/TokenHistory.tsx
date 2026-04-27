'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TokenRecord {
  id: number;
  tokenType: string;
  value: number | null;
  token: string;
  generatedAt: Date | string;
  generatedBy: number;
}

interface TokenHistoryProps {
  records: TokenRecord[];
}

export function TokenHistory({ records }: TokenHistoryProps) {
  return (
    <div className="surface-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-secondary/70 bg-secondary text-secondary-foreground">
          <Clock size={16} strokeWidth={2.25} />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Recent Tokens
        </h3>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted/45">
            <Clock size={24} strokeWidth={2} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            No tokens generated yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record, index) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: index * 0.05,
                duration: 0.22,
                ease: [0.2, 0.8, 0.2, 1]
              }}
              className="flex items-center justify-between rounded-lg border border-border/75 bg-muted/28 p-3 transition-colors hover:bg-muted/40"
            >
              <div>
                <div className="mb-1 text-sm font-semibold text-foreground">
                  {record.tokenType}
                </div>
                {record.value && (
                  <div className="text-xs text-muted-foreground font-medium">
                    {record.value} days
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {formatDistanceToNow(new Date(record.generatedAt))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
