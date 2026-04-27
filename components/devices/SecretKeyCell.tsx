'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function SecretKeyCell({ secretKey }: { secretKey: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs font-mono px-2 py-1 bg-muted rounded border border-border text-foreground">
        {revealed ? secretKey : "••••••••••••••••"}
      </code>
      <button
        onClick={() => setRevealed(!revealed)}
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label={revealed ? "Hide secret key" : "Reveal secret key"}
      >
        {revealed ? <EyeOff size={16} strokeWidth={2.5} /> : <Eye size={16} strokeWidth={2.5} />}
      </button>
    </div>
  );
}
