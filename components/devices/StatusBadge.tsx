import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';

type Status = 'active' | 'offline' | 'warning' | 'pending' | 'error';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  pulse?: boolean;
}

const statusConfig = {
  active: {
    dot: 'text-status-active',
    badge: 'border-status-active/40 bg-status-active/10 text-status-active',
    label: 'Active',
  },
  offline: {
    dot: 'text-status-offline',
    badge: 'border-status-offline/35 bg-status-offline/10 text-status-offline',
    label: 'Offline',
  },
  warning: {
    dot: 'text-status-warning',
    badge: 'border-status-warning/35 bg-status-warning/10 text-status-warning',
    label: 'Warning',
  },
  pending: {
    dot: 'text-status-pending',
    badge: 'border-status-pending/35 bg-status-pending/10 text-status-pending',
    label: 'Pending',
  },
  error: {
    dot: 'text-status-error',
    badge: 'border-status-error/35 bg-status-error/10 text-status-error',
    label: 'Error',
  },
};

export function StatusBadge({ status, label, pulse = false }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1',
        'text-[11px] font-semibold uppercase tracking-wide',
        config.badge
      )}
    >
      <span className="relative flex items-center justify-center">
        <Circle 
          className={cn(
            'h-2.5 w-2.5 fill-current',
            config.dot,
            pulse && status === 'active' && 'status-pulse'
          )} 
        />
      </span>
      {displayLabel}
    </span>
  );
}
