import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Plug, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/use-tenant';
import { useCreateCmsConnection } from '@/hooks/use-cms-connection';
import { maskToken } from '@/lib/utils';

interface ConnectionsPageProps {
  tenantId: string;
}

export default function ConnectionsPage({ tenantId }: ConnectionsPageProps) {
  const { data: tenant, isLoading } = useTenant(tenantId);
  const createConnection = useCreateCmsConnection(tenantId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    accessToken: '',
    contentDatabaseId: '',
    triggerDatabaseId: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await createConnection.mutateAsync({
        accessToken: form.accessToken,
        contentDatabaseId: form.contentDatabaseId,
        triggerDatabaseId: form.triggerDatabaseId || undefined,
      });
      toast.success('Connection added');
      setForm({ accessToken: '', contentDatabaseId: '', triggerDatabaseId: '' });
      setShowForm(false);
    } catch {
      toast.error('Failed to add connection');
    }
  }

  const connections = tenant?.cmsConnections ?? [];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
          <p className="text-sm text-muted-foreground">
            Manage your Notion CMS connections.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="outline">
          <Plus className="h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {/* Existing Connections */}
      {connections.length > 0 ? (
        <div className="space-y-3">
          {connections.map((conn) => (
            <Card key={conn.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <Plug className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{conn.provider}</span>
                    {conn.isActive ? (
                      <Badge variant="secondary" className="gap-1 bg-green-50 text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 bg-red-50 text-red-700">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Token: {maskToken(conn.accessToken)}</p>
                    <p>Content DB: {conn.contentDatabaseId}</p>
                    {conn.triggerDatabaseId && <p>Trigger DB: {conn.triggerDatabaseId}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No connections yet. Add a Notion connection to publish blog posts.
          </CardContent>
        </Card>
      )}

      {/* Add Connection Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Notion Connection</CardTitle>
            <CardDescription>
              Enter your Notion integration credentials.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="ntn_..."
                  value={form.accessToken}
                  onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contentDatabaseId">Content Database ID</Label>
                <Input
                  id="contentDatabaseId"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.contentDatabaseId}
                  onChange={(e) =>
                    setForm({ ...form, contentDatabaseId: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="triggerDatabaseId">Trigger Database ID (optional)</Label>
                <Input
                  id="triggerDatabaseId"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.triggerDatabaseId}
                  onChange={(e) =>
                    setForm({ ...form, triggerDatabaseId: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createConnection.isPending}>
                  {createConnection.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add Connection
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
