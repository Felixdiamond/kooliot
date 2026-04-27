'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Cpu, 
  Key, 
  ClipboardList,
  Shield,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tone: 'bg-primary/14 text-primary border-primary/30' },
  { label: 'Devices', href: '/devices', icon: Cpu, tone: 'bg-quaternary/12 text-quaternary border-quaternary/25' },
  { label: 'Assignments', href: '/assignments', icon: ClipboardList, tone: 'bg-tertiary/14 text-foreground border-tertiary/35' },
  { label: 'Tokens', href: '/tokens', icon: Key, tone: 'bg-primary/10 text-primary border-primary/22' },
];

const adminItems: NavItem[] = [
  { label: 'Access Control', href: '/admin/access', icon: Shield, tone: 'bg-primary/14 text-primary border-primary/30' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [openTaskCount, setOpenTaskCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchOpenTaskCount = async () => {
      try {
        const response = await fetch('/api/tasks/open-count', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { count?: number };
        if (!cancelled && typeof payload.count === 'number') {
          setOpenTaskCount(payload.count);
        }
      } catch {
        // Ignore transient network errors.
      }
    };

    void fetchOpenTaskCount();
    const timer = window.setInterval(fetchOpenTaskCount, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const assignmentBadgeLabel = openTaskCount > 99 ? '99+' : String(openTaskCount);

  return (
    <nav className="flex flex-col gap-2 px-3">
      <div className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-11 items-center gap-3 rounded-lg border px-4 text-sm font-semibold transition-all duration-200',
                active
                  ? cn('shadow-sm', item.tone)
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon 
                size={18} 
                strokeWidth={2.25}
              />
              {item.label}
              {item.href === '/assignments' && openTaskCount > 0 ? (
                <span className="ml-auto flex items-center gap-1">
                  <Bell size={12} strokeWidth={2.5} className="text-primary" />
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {assignmentBadgeLabel}
                  </span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 space-y-2">
        <div className="px-4 mb-3 flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Admin
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        {adminItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-11 items-center gap-3 rounded-lg border px-4 text-sm font-semibold transition-all duration-200',
                active
                  ? cn('shadow-sm', item.tone)
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon 
                size={18} 
                strokeWidth={2.25}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
