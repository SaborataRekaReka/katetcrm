import { useEffect, ReactNode } from 'react';
import { TooltipProvider } from '../ui/tooltip';
import { LayoutProvider, useLayout } from './layoutStore';
import { GlobalTopbar } from './GlobalTopbar';
import { NotificationStrip } from './NotificationStrip';
import { PrimaryRail } from './PrimaryRail';
import { SecondarySidebar } from './SecondarySidebar';

function KeyboardShortcuts() {
  const { toggleSidebar } = useLayout();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LayoutProvider>
      <TooltipProvider delayDuration={200}>
        <KeyboardShortcuts />
        <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--shell-app-bg)] text-foreground">
          <GlobalTopbar />
          <NotificationStrip />
          <div className="flex min-h-0 flex-1 gap-1.5 p-1.5">
            <PrimaryRail />
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-[var(--shell-frame-border)] bg-[var(--shell-sidebar-bg)]">
              <SecondarySidebar />
              <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-[var(--shell-inner-divider)] bg-[var(--shell-main-bg)]">
                {children}
              </main>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </LayoutProvider>
  );
}
