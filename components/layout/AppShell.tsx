'use client';

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastProvider } from "@/components/ui/toaster";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Don't show shell on login/register pages
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="relative flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
