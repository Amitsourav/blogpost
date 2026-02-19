import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppLayoutProps {
  children: ReactNode;
  tenantId: string;
  onLogout: () => void;
}

export function AppLayout({ children, tenantId, onLogout }: AppLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header tenantId={tenantId} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
