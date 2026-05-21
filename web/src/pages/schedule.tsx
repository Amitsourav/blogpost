import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  XCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useScheduleConfig,
  useUpsertScheduleConfig,
  useScheduledPosts,
  useAddScheduledPosts,
  useReorderPost,
  useCancelPost,
  useDeletePost,
} from '@/hooks/use-schedule';
import { formatDate, cn } from '@/lib/utils';
import type { ScheduledPostStatus } from '@/types';

const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const STATUS_CONFIG: Record<ScheduledPostStatus, { label: string; className: string }> = {
  QUEUED: { label: 'Queued', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  PROCESSING: { label: 'Processing', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const ALL_STATUSES: ScheduledPostStatus[] = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];

export default function SchedulePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Add topics to the queue and set auto-publishing frequency.
        </p>
      </div>

      <ScheduleSettings />
      <AddTopicsForm />
      <TopicQueue />
    </div>
  );
}

function ScheduleSettings() {
  const { data: config, isLoading } = useScheduleConfig();
  const upsert = useUpsertScheduleConfig();

  const [form, setForm] = useState({
    isActive: false,
    postsPerDay: 1,
    timeOfDay: '10:00',
    timezone: 'Asia/Kolkata',
  });

  useEffect(() => {
    if (config) {
      setForm({
        isActive: config.isActive,
        postsPerDay: config.postsPerDay,
        timeOfDay: config.timeOfDay,
        timezone: config.timezone,
      });
    }
  }, [config]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await upsert.mutateAsync(form);
      toast.success('Schedule settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Auto-Publish Settings</CardTitle>
        <CardDescription>
          Configure how often the agent should automatically generate and publish blog posts from your queue.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring" />
            </label>
            <span className="text-sm font-medium">
              {form.isActive ? 'Auto-publishing enabled' : 'Auto-publishing disabled'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="postsPerDay">Posts per day</Label>
              <Input
                id="postsPerDay"
                type="number"
                min={1}
                max={10}
                value={form.postsPerDay}
                onChange={(e) => setForm({ ...form, postsPerDay: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeOfDay">Start time</Label>
              <Input
                id="timeOfDay"
                type="time"
                value={form.timeOfDay}
                onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => setForm({ ...form, timezone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AddTopicsForm() {
  const [topics, setTopics] = useState('');
  const [keywords, setKeywords] = useState('');
  const addPosts = useAddScheduledPosts();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const topicLines = topics
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (topicLines.length === 0) return;

    const keywordList = keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const result = await addPosts.mutateAsync({
        posts: topicLines.map((topic) => ({
          topic,
          keywords: keywordList.length > 0 ? keywordList : undefined,
        })),
      });
      toast.success(`${result.count} topic(s) added to queue`);
      setTopics('');
      setKeywords('');
    } catch {
      toast.error('Failed to add topics');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add Topics</CardTitle>
        <CardDescription>Enter one topic per line. They'll be added to the end of the queue.</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topics">Topics (one per line)</Label>
            <Textarea
              id="topics"
              placeholder={"Best education loans for studying in Canada\nHow to get a scholarship for MBA abroad\nSBI vs HDFC education loan comparison"}
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulkKeywords">Keywords for all topics (comma-separated, optional)</Label>
            <Input
              id="bulkKeywords"
              placeholder="education loan, study abroad, scholarship"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={addPosts.isPending || !topics.trim()}>
            {addPosts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add to Queue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TopicQueue() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ScheduledPostStatus | ''>('');
  const limit = 15;

  const { data, isLoading } = useScheduledPosts({ page, limit, status: statusFilter });
  const reorderPost = useReorderPost();
  const cancelPost = useCancelPost();
  const deletePost = useDeletePost();

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  async function handleMoveUp(postId: string, currentPosition: number) {
    if (currentPosition <= 0) return;
    try {
      await reorderPost.mutateAsync({ postId, newPosition: currentPosition - 1 });
    } catch {
      toast.error('Failed to reorder');
    }
  }

  async function handleMoveDown(postId: string, currentPosition: number) {
    try {
      await reorderPost.mutateAsync({ postId, newPosition: currentPosition + 1 });
    } catch {
      toast.error('Failed to reorder');
    }
  }

  async function handleCancel(postId: string) {
    try {
      await cancelPost.mutateAsync(postId);
      toast.success('Post cancelled');
    } catch {
      toast.error('Failed to cancel');
    }
  }

  async function handleDelete(postId: string) {
    try {
      await deletePost.mutateAsync(postId);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Topic Queue</CardTitle>
            <CardDescription>
              {data ? `${data.total} topic(s) in queue` : 'Loading...'}
            </CardDescription>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v === 'all' ? '' : (v as ScheduledPostStatus));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Topic</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-6" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-24 ml-auto" /></td>
                  </tr>
                ))}
              {data?.posts.map((post) => {
                const statusCfg = STATUS_CONFIG[post.status];
                return (
                  <tr key={post.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{post.position + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{post.topic}</div>
                      {post.keywords.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {post.keywords.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn(statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                      {post.errorMessage && (
                        <p className="text-xs text-destructive mt-1">{post.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {post.status === 'QUEUED' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveUp(post.id, post.position)}
                              disabled={post.position === 0 || reorderPost.isPending}
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveDown(post.id, post.position)}
                              disabled={reorderPost.isPending}
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(post.id)}
                              disabled={cancelPost.isPending}
                              title="Cancel"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {['QUEUED', 'CANCELLED'].includes(post.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(post.id)}
                            disabled={deletePost.isPending}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {post.taskId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="View task"
                          >
                            <a href={`/tasks`}>
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data && data.posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No topics in queue. Add some above to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <>
            <Separator />
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({data?.total} total)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
