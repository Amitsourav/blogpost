import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, CheckCircle2, Circle, Loader2, XCircle, ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGenerate, useTaskPolling } from '@/hooks/use-generate';
import type { ContentTaskStatus } from '@/types';
import { cn } from '@/lib/utils';

const STEPS: { status: ContentTaskStatus; label: string }[] = [
  { status: 'PENDING', label: 'Queued' },
  { status: 'IN_PROGRESS', label: 'Processing' },
  { status: 'GENERATING', label: 'Writing Content' },
  { status: 'PUBLISHING', label: 'Publishing to Notion' },
  { status: 'PUBLISHED', label: 'Published' },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  IN_PROGRESS: 1,
  GENERATING: 2,
  PUBLISHING: 3,
  PUBLISHED: 4,
};

function StepIcon({ step, currentStatus }: { step: ContentTaskStatus; currentStatus: ContentTaskStatus }) {
  const stepIndex = STATUS_ORDER[step] ?? -1;
  const currentIndex = STATUS_ORDER[currentStatus] ?? -1;

  if (currentStatus === 'FAILED') {
    if (stepIndex === currentIndex || (currentIndex === -1 && stepIndex === 0)) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (stepIndex < currentIndex) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground" />;
  }

  const isTerminalStatus = ['PUBLISHED', 'CANCELLED'].includes(currentStatus);

  if (stepIndex < currentIndex || (stepIndex === currentIndex && isTerminalStatus)) {
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  }
  if (stepIndex === currentIndex) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

export default function GeneratePage() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const generate = useGenerate();
  const { data: task } = useTaskPolling(activeTaskId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    try {
      const keywordList = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const result = await generate.mutateAsync({
        topic: topic.trim(),
        keywords: keywordList.length > 0 ? keywordList : undefined,
      });

      setActiveTaskId(result.taskId);
      toast.success('Generation started!');
    } catch {
      toast.error('Failed to start generation');
    }
  }

  function handleReset() {
    setActiveTaskId(null);
    setTopic('');
    setKeywords('');
  }

  const isTerminal = task && ['PUBLISHED', 'FAILED', 'CANCELLED'].includes(task.status);
  const blog = task?.output?.blog;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Generate Blog</h1>
        <p className="text-sm text-muted-foreground">
          Enter a topic and optional keywords to generate an SEO-optimized blog post.
        </p>
      </div>

      {!activeTaskId && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Textarea
                  id="topic"
                  placeholder="e.g., How to implement CI/CD pipelines for Node.js applications"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (comma-separated, optional)</Label>
                <Input
                  id="keywords"
                  placeholder="e.g., CI/CD, Node.js, GitHub Actions, DevOps"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={generate.isPending || !topic.trim()}>
                {generate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generate.isPending ? 'Starting...' : 'Generate'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTaskId && task && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress</CardTitle>
            <CardDescription>Topic: {task.inputTopic}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Steps */}
            <div className="space-y-3">
              {STEPS.map((step, i) => (
                <div key={step.status} className="flex items-center gap-3">
                  <StepIcon step={step.status} currentStatus={task.status} />
                  <span
                    className={cn(
                      'text-sm',
                      (STATUS_ORDER[task.status] ?? -1) >= (STATUS_ORDER[step.status] ?? -1)
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className="ml-[9px] hidden h-3 w-px bg-border sm:block" />
                  )}
                </div>
              ))}
            </div>

            {/* Error State */}
            {task.status === 'FAILED' && (
              <>
                <Separator />
                <div className="rounded-md bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">Generation failed</p>
                  {task.errorMessage && (
                    <p className="mt-1 text-sm text-destructive/80">{task.errorMessage}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleReset}>
                      <RotateCcw className="h-3 w-3" />
                      Try Again
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Success State */}
            {task.status === 'PUBLISHED' && blog && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold">{blog.title}</h3>
                  <p className="text-sm text-muted-foreground">{blog.excerpt}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>By {blog.author}</span>
                    <span>&middot;</span>
                    <span>{blog.readTimeMinutes} min read</span>
                    {blog.tags.length > 0 && (
                      <>
                        <span>&middot;</span>
                        <span>{blog.tags.join(', ')}</span>
                      </>
                    )}
                  </div>
                  {task.publishedCmsId && (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`https://notion.so/${task.publishedCmsId.replace(/-/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View in Notion
                      </a>
                    </Button>
                  )}
                </div>
              </>
            )}

            {isTerminal && (
              <>
                <Separator />
                <Button variant="outline" onClick={handleReset}>
                  Generate Another
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
