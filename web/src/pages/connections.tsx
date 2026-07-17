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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenant } from '@/hooks/use-tenant';
import { useCreateCmsConnection } from '@/hooks/use-cms-connection';
import { maskToken } from '@/lib/utils';

interface ConnectionsPageProps {
  tenantId: string;
}

type Provider = 'notion' | 'shopify';

const EMPTY_FORM = {
  accessToken: '',
  contentDatabaseId: '',
  triggerDatabaseId: '',
  storeDomain: '',
};

export default function ConnectionsPage({ tenantId }: ConnectionsPageProps) {
  const { data: tenant, isLoading } = useTenant(tenantId);
  const createConnection = useCreateCmsConnection(tenantId);

  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState<Provider>('notion');
  const [form, setForm] = useState(EMPTY_FORM);

  const isShopify = provider === 'shopify';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await createConnection.mutateAsync({
        provider,
        accessToken: form.accessToken,
        // For Shopify this field carries the blog reference (a handle like "news").
        // Blank tells the adapter to fall back to the store's first blog.
        contentDatabaseId: isShopify
          ? form.contentDatabaseId || 'news'
          : form.contentDatabaseId,
        triggerDatabaseId: isShopify ? undefined : form.triggerDatabaseId || undefined,
        config: isShopify
          ? { storeDomain: form.storeDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') }
          : undefined,
      });
      toast.success('Connection added');
      setForm(EMPTY_FORM);
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
            Manage where your blog posts get published.
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
                    {conn.provider === 'shopify' ? (
                      <>
                        <p>Store: {String(conn.config?.storeDomain ?? '—')}</p>
                        <p>Blog: {conn.contentDatabaseId || 'first blog'}</p>
                      </>
                    ) : (
                      <>
                        <p>Content DB: {conn.contentDatabaseId}</p>
                        {conn.triggerDatabaseId && (
                          <p>Trigger DB: {conn.triggerDatabaseId}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No connections yet. Add a Notion or Shopify connection to publish blog posts.
          </CardContent>
        </Card>
      )}

      {/* Add Connection Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Connection</CardTitle>
            <CardDescription>
              {isShopify
                ? 'Enter your Shopify custom app credentials.'
                : 'Enter your Notion integration credentials.'}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => {
                    setProvider(v as Provider);
                    setForm(EMPTY_FORM);
                  }}
                >
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notion">Notion</SelectItem>
                    <SelectItem value="shopify">Shopify</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isShopify && (
                <div className="space-y-2">
                  <Label htmlFor="storeDomain">Store Domain</Label>
                  <Input
                    id="storeDomain"
                    placeholder="your-store.myshopify.com"
                    value={form.storeDomain}
                    onChange={(e) => setForm({ ...form, storeDomain: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder={isShopify ? 'shpat_...' : 'ntn_...'}
                  value={form.accessToken}
                  onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentDatabaseId">
                  {isShopify ? 'Blog Handle' : 'Content Database ID'}
                </Label>
                <Input
                  id="contentDatabaseId"
                  placeholder={isShopify ? 'news' : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
                  value={form.contentDatabaseId}
                  onChange={(e) =>
                    setForm({ ...form, contentDatabaseId: e.target.value })
                  }
                  required={!isShopify}
                />
                {isShopify && (
                  <p className="text-xs text-muted-foreground">
                    The blog to publish into, from your Shopify URL
                    (/blogs/<span className="font-medium">news</span>). Leave blank to use
                    the store's first blog.
                  </p>
                )}
              </div>

              {!isShopify && (
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
              )}
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
