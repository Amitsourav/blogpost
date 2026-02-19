import { useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/status-badge';
import { useTasks, useRetryTask } from '@/hooks/use-tasks';
import { formatDate } from '@/lib/utils';
import type { ContentTask, ContentTaskStatus } from '@/types';

const ALL_STATUSES: ContentTaskStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'GENERATING',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED',
];

export default function TasksPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContentTaskStatus | ''>('');
  const [selectedTask, setSelectedTask] = useState<ContentTask | null>(null);
  const limit = 10;

  const { data, isLoading } = useTasks({ page, limit, status: statusFilter });
  const retryTask = useRetryTask();

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  async function handleRetry(taskId: string) {
    try {
      await retryTask.mutateAsync(taskId);
      toast.success('Retry initiated');
    } catch {
      toast.error('Failed to retry task');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            View all generated blog posts and their status.
          </p>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === 'all' ? '' : (v as ContentTaskStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
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
                      <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))}
                {data?.tasks.map((task) => (
                  <tr key={task.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium">
                      {task.output?.blog?.title || task.inputTopic}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(task.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTask(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {task.status === 'FAILED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRetry(task.id)}
                            disabled={retryTask.isPending}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.tasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No tasks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onRetry={handleRetry}
      />
    </div>
  );
}

function TaskDetailDialog({
  task,
  onClose,
  onRetry,
}: {
  task: ContentTask | null;
  onClose: () => void;
  onRetry: (id: string) => void;
}) {
  if (!task) return null;

  const blog = task.output?.blog;
  const seo = task.output?.seo;

  return (
    <Dialog open={!!task} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{blog?.title || task.inputTopic}</DialogTitle>
          <DialogDescription>
            <StatusBadge status={task.status} />
            <span className="ml-2">{formatDate(task.createdAt)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Blog Content */}
          {blog && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Content</h4>
              <p className="text-sm text-muted-foreground">{blog.excerpt}</p>
              <div className="max-h-60 overflow-y-auto rounded-md border p-3 text-sm">
                {blog.content.split('\n').map((line, i) => (
                  <p key={i} className={line ? '' : 'h-4'}>
                    {line}
                  </p>
                ))}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Author: {blog.author}</span>
                <span>{blog.readTimeMinutes} min read</span>
              </div>
            </div>
          )}

          {/* SEO Metadata */}
          {seo && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">SEO Metadata</h4>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Meta Title:</span> {seo.metaTitle}
                </div>
                <div>
                  <span className="text-muted-foreground">Meta Description:</span>{' '}
                  {seo.metaDescription}
                </div>
                <div>
                  <span className="text-muted-foreground">Focus Keyword:</span>{' '}
                  {seo.focusKeyword}
                </div>
                {seo.secondaryKeywords.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Secondary Keywords:</span>{' '}
                    {seo.secondaryKeywords.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {task.errorMessage && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{task.errorMessage}</p>
            </div>
          )}

          {/* Logs */}
          {task.logs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Logs</h4>
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {task.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-3 border-b px-3 py-2 text-xs last:border-0"
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                    <span className="shrink-0 font-mono uppercase text-muted-foreground">
                      {log.stage}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {task.status === 'FAILED' && (
            <Button size="sm" onClick={() => onRetry(task.id)}>
              <RotateCcw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
