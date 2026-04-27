'use client';

import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface TokenPinDisplayProps {
  pin: string;
  validDays?: number;
}

export function TokenPinDisplay({ pin, validDays }: TokenPinDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pin.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="bg-[var(--bg-elevated)] border border-[var(--accent-primary-border)] border-l-4 border-l-[var(--accent-primary)] rounded-lg p-4 mt-4"
    >
      <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-mono-data mb-3">
        Generated Token
      </div>
      
      <div className="text-[28px] font-semibold text-[var(--text-primary)] font-mono-data tracking-[0.2em] mb-3 select-all">
        {pin}
      </div>

      <div className="flex items-center justify-between">
        {validDays && (
          <span className="text-[12px] text-[var(--text-secondary)]">
            Valid for {validDays} days
          </span>
        )}
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-overlay)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[12px]"
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
