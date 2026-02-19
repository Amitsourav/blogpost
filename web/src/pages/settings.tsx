import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, Copy, LogOut, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/hooks/use-tenant';
import { useUpdateBrandProfile } from '@/hooks/use-brand-profile';
import { getConfig, clearConfig } from '@/lib/config';

interface SettingsPageProps {
  tenantId: string;
  onLogout?: () => void;
}

export default function SettingsPage({ tenantId, onLogout }: SettingsPageProps) {
  const { data: tenant, isLoading } = useTenant(tenantId);
  const updateProfile = useUpdateBrandProfile(tenantId);
  const [showApiKey, setShowApiKey] = useState(false);
  const config = getConfig();

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  }

  function handleLogout() {
    clearConfig();
    onLogout?.();
    window.location.reload();
  }

  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    brandTone: '',
    targetAudience: '',
    writingGuidelines: '',
    defaultAuthor: '',
    seoPreferences: '',
    contentRules: '',
    customPrompt: '',
  });

  useEffect(() => {
    if (tenant?.brandProfile) {
      const bp = tenant.brandProfile;
      setForm({
        companyName: bp.companyName || '',
        industry: bp.industry || '',
        brandTone: bp.brandTone || '',
        targetAudience: bp.targetAudience || '',
        writingGuidelines: bp.writingGuidelines || '',
        defaultAuthor: bp.defaultAuthor || '',
        seoPreferences: bp.seoPreferences ? JSON.stringify(bp.seoPreferences, null, 2) : '',
        contentRules: bp.contentRules?.length ? JSON.stringify(bp.contentRules, null, 2) : '',
        customPrompt: bp.customPrompt || '',
      });
    }
  }, [tenant]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    let seoPreferences: Record<string, unknown> = {};
    let contentRules: unknown[] = [];

    if (form.seoPreferences.trim()) {
      try {
        seoPreferences = JSON.parse(form.seoPreferences);
      } catch {
        toast.error('SEO Preferences must be valid JSON');
        return;
      }
    }

    if (form.contentRules.trim()) {
      try {
        contentRules = JSON.parse(form.contentRules);
        if (!Array.isArray(contentRules)) {
          toast.error('Content Rules must be a JSON array');
          return;
        }
      } catch {
        toast.error('Content Rules must be valid JSON');
        return;
      }
    }

    try {
      await updateProfile.mutateAsync({
        companyName: form.companyName,
        industry: form.industry,
        brandTone: form.brandTone,
        targetAudience: form.targetAudience,
        writingGuidelines: form.writingGuidelines,
        defaultAuthor: form.defaultAuthor,
        seoPreferences,
        contentRules,
        customPrompt: form.customPrompt,
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your brand profile to customize generated content.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Credentials</CardTitle>
          <CardDescription>
            Save these credentials to connect from another device or browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tenant ID</Label>
            <div className="flex gap-2">
              <Input value={tenantId} readOnly className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(tenantId, 'Tenant ID')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                value={showApiKey ? (config?.apiKey || '') : '••••••••••••••••••••••••'}
                readOnly
                className="font-mono text-xs"
                type={showApiKey ? 'text' : 'password'}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(config?.apiKey || '', 'API Key')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Separator />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Disconnect &amp; Logout
          </Button>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Brand Profile</CardTitle>
            <CardDescription>
              This information shapes the tone, style, and audience of your generated blogs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={form.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandTone">Brand Tone</Label>
              <Input
                id="brandTone"
                placeholder="e.g., Professional, friendly, authoritative"
                value={form.brandTone}
                onChange={(e) => handleChange('brandTone', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Input
                id="targetAudience"
                placeholder="e.g., SaaS developers and engineering managers"
                value={form.targetAudience}
                onChange={(e) => handleChange('targetAudience', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="writingGuidelines">Writing Guidelines</Label>
              <Textarea
                id="writingGuidelines"
                placeholder="Style rules, formatting preferences, etc."
                value={form.writingGuidelines}
                onChange={(e) => handleChange('writingGuidelines', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultAuthor">Default Author</Label>
              <Input
                id="defaultAuthor"
                value={form.defaultAuthor}
                onChange={(e) => handleChange('defaultAuthor', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoPreferences">SEO Preferences (JSON)</Label>
              <Textarea
                id="seoPreferences"
                placeholder='{"focusOnLongTail": true}'
                value={form.seoPreferences}
                onChange={(e) => handleChange('seoPreferences', e.target.value)}
                rows={3}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentRules">Content Rules (JSON array)</Label>
              <Textarea
                id="contentRules"
                placeholder='["Always include a call to action", "Minimum 1500 words"]'
                value={form.contentRules}
                onChange={(e) => handleChange('contentRules', e.target.value)}
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom Writing Prompt</CardTitle>
            <CardDescription>
              Paste your full writing prompt here. When set, this overrides the default prompt built from the brand profile fields above. Leave empty to use the auto-generated prompt.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-2">
            <Textarea
              id="customPrompt"
              placeholder="You are a human SEO content writer for [Company Name]..."
              value={form.customPrompt}
              onChange={(e) => handleChange('customPrompt', e.target.value)}
              rows={16}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              The topic and keywords will be appended automatically.
            </p>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save All Settings
        </Button>
      </form>
    </div>
  );
}
