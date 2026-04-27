'use client';

import { Menu, Zap } from 'lucide-react';

interface TopbarProps {
  onMenuClick?: () => void;
  children?: React.ReactNode;
}

export function Topbar({ onMenuClick, children }: TopbarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center border-b border-border bg-card/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="-ml-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} strokeWidth={2.25} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/12 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <p className="font-heading text-base font-semibold leading-none text-foreground">KoolIoT</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Operations Console</p>
          </div>
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </header>
  );
}
