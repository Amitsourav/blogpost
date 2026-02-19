import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/hooks/use-tenant';

interface HeaderProps {
  tenantId: string;
  onLogout: () => void;
}

export function Header({ tenantId, onLogout }: HeaderProps) {
  const { data: tenant } = useTenant(tenantId);

  const displayName = tenant?.brandProfile?.companyName || tenant?.name || 'Loading...';

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="text-sm font-medium text-foreground">
        {displayName}
      </div>
      <Button variant="ghost" size="sm" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        Disconnect
      </Button>
    </header>
  );
}
