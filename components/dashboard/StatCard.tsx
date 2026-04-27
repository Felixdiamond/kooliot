'use client';

import { Activity, Battery, Cpu, LucideIcon, Zap } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

type StatIconName = 'activity' | 'zap' | 'battery' | 'cpu';

const STAT_ICONS: Record<StatIconName, LucideIcon> = {
  activity: Activity,
  zap: Zap,
  battery: Battery,
  cpu: Cpu,
};

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  iconName?: StatIconName;
  meta?: string;
  status?: 'active' | 'offline' | 'warning';
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  accentColor?: 'accent' | 'secondary' | 'tertiary' | 'quaternary';
}

export function StatCard({ 
  label, 
  value, 
  unit, 
  iconName,
  meta, 
  status, 
  trend,
  accentColor = 'accent'
}: StatCardProps) {
  const Icon = iconName ? STAT_ICONS[iconName] : undefined;
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (typeof value === 'number') {
      const controls = animate(count, value, { duration: 0.5 });
      return controls.stop;
    }
  }, [value, count]);

  const displayValue = typeof value === 'number' ? rounded : value;

  const colorClasses = {
    accent: 'bg-primary/12 text-primary border-primary/25',
    secondary: 'bg-secondary text-secondary-foreground border-border',
    tertiary: 'bg-tertiary/16 text-foreground border-tertiary/28',
    quaternary: 'bg-quaternary/16 text-quaternary border-quaternary/25',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {Icon && (
        <div 
          className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md border ${colorClasses[accentColor]}`}
        >
          <Icon size={18} strokeWidth={2.25} />
        </div>
      )}

      <div className="mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <motion.span className="font-heading text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-5xl">
            {typeof displayValue === 'number' ? displayValue : value}
          </motion.span>
          {unit && (
            <span className="text-base font-semibold text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`font-semibold ${trend.direction === 'up' ? 'text-status-active' : 'text-status-error'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {meta && <span className="text-muted-foreground">{meta}</span>}
        </div>
        {status && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${status === 'active' ? 'status-pulse' : ''}`}
              style={{
                backgroundColor:
                  status === 'active'
                    ? 'var(--status-active)'
                    : status === 'warning'
                    ? 'var(--status-warning)'
                    : 'var(--status-offline)',
              }}
            />
            <span className="text-muted-foreground text-xs uppercase font-bold">
              {status}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
