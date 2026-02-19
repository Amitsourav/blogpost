import { Routes, Route } from 'react-router-dom';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { SetupGate } from '@/components/setup-gate';
import { AppLayout } from '@/components/layout/app-layout';
import GeneratePage from '@/pages/generate';
import TasksPage from '@/pages/tasks';
import SettingsPage from '@/pages/settings';
import ConnectionsPage from '@/pages/connections';

export default function App() {
  const { config, isConfigured, save, clear } = useTenantConfig();

  if (!isConfigured) {
    return <SetupGate onSave={save} />;
  }

  return (
    <AppLayout tenantId={config!.tenantId} onLogout={clear}>
      <Routes>
        <Route path="/" element={<GeneratePage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/settings" element={<SettingsPage tenantId={config!.tenantId} onLogout={clear} />} />
        <Route path="/connections" element={<ConnectionsPage tenantId={config!.tenantId} />} />
      </Routes>
    </AppLayout>
  );
}
