import { Badge } from '@/components/ui/badge';
import type { ContentTaskStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<ContentTaskStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  GENERATING: { label: 'Generating', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  PUBLISHING: { label: 'Publishing', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  PUBLISHED: { label: 'Published', className: 'bg-green-100 text-green-700 border-green-200' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export function StatusBadge({ status }: { status: ContentTaskStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
