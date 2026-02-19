import { useState } from 'react';
import { Sparkles, Plus, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api-client';
import { setConfig } from '@/lib/config';
import type { Tenant, TenantConfig } from '@/types';

interface SetupGateProps {
  onSave: (config: TenantConfig) => void;
}

type Mode = 'choose' | 'connect' | 'create';

export function SetupGate({ onSave }: SetupGateProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [loading, setLoading] = useState(false);

  // Connect form
  const [apiKey, setApiKey] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Create form
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim() || !tenantId.trim()) return;

    setLoading(true);
    try {
      setConfig({ apiKey: apiKey.trim(), tenantId: tenantId.trim() });
      await api.get<Tenant>(`/tenants/${tenantId.trim()}`);
      onSave({ apiKey: apiKey.trim(), tenantId: tenantId.trim() });
      toast.success('Connected successfully!');
    } catch {
      toast.error('Failed to connect. Check your API key and tenant ID.');
      localStorage.removeItem('blog-agent-config');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !slug.trim()) return;

    setLoading(true);
    try {
      const tenant = await api.post<Tenant>('/tenants', {
        name: companyName.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      });
      setConfig({ apiKey: tenant.apiKey, tenantId: tenant.id });
      onSave({ apiKey: tenant.apiKey, tenantId: tenant.id });
      toast.success(`Company "${tenant.name}" created! Your API key: ${tenant.apiKey}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  }

  function autoSlug(name: string) {
    setCompanyName(name);
    setSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-'),
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">AI Blog Agent</CardTitle>
          <CardDescription>
            {mode === 'choose' && 'Connect to an existing company or create a new one.'}
            {mode === 'connect' && 'Enter your existing tenant credentials.'}
            {mode === 'create' && 'Set up a new company to start generating blogs.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'choose' && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={() => setMode('connect')}
              >
                <LogIn className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Connect Existing Company</div>
                  <div className="text-xs text-muted-foreground">
                    I have a Tenant ID and API Key
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={() => setMode('create')}
              >
                <Plus className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Create New Company</div>
                  <div className="text-xs text-muted-foreground">
                    Set up a new company for blog generation
                  </div>
                </div>
              </Button>
            </div>
          )}

          {mode === 'connect' && (
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant ID</Label>
                <Input
                  id="tenantId"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="tak_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Connecting...' : 'Connect'}
              </Button>
              <Separator />
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode('choose')}
              >
                Back
              </Button>
            </form>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g. FundMyCampus"
                  value={companyName}
                  onChange={(e) => autoSlug(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  placeholder="e.g. fundmycampus"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Company'}
              </Button>
              <Separator />
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode('choose')}
              >
                Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
