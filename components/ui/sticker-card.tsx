import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StickerCardProps {
  children: ReactNode;
  className?: string;
  shadowColor?: 'default' | 'accent' | 'secondary' | 'tertiary' | 'quaternary';
  hover?: boolean;
  icon?: ReactNode;
}

export function StickerCard({ 
  children, 
  className, 
  shadowColor = 'default',
  hover = false,
  icon 
}: StickerCardProps) {
  const ringColor =
    shadowColor === 'accent'
      ? 'ring-primary/20'
      : shadowColor === 'secondary'
      ? 'ring-secondary/40'
      : shadowColor === 'tertiary'
      ? 'ring-tertiary/35'
      : shadowColor === 'quaternary'
      ? 'ring-quaternary/30'
      : 'ring-border/80';

  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card p-6 shadow-sm ring-1',
        ringColor,
        'transition-all duration-200 ease-out',
        hover && 'hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
    >
      {icon && (
        <div className="absolute -top-5 left-6 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/12 text-primary">
          {icon}
        </div>
      )}
      {children}
    </div>
  );
}
