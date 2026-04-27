'use client';

import { X } from 'lucide-react';
import { SidebarNav } from './SidebarNav';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-72 border-r border-border bg-card transition-transform duration-200 lg:sticky',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <span className="font-heading text-sm font-semibold text-foreground">Navigation</span>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <SidebarNav />
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            KoolIoT v0.1.0
          </div>
        </div>
      </aside>
    </>
  );
}
