import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const campaignBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
  {
    variants: {
      status: {
        draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        stopped: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
    },
    defaultVariants: {
      status: 'draft',
    },
  }
);

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'stopped';

interface CampaignStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof campaignBadgeVariants> {
  status: CampaignStatus;
  label?: string;
}

const statusLabels: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  stopped: 'Stopped',
};

export function CampaignStatusBadge({
  status,
  label,
  className,
  ...props
}: CampaignStatusBadgeProps) {
  return (
    <span
      className={cn(campaignBadgeVariants({ status }), className)}
      {...props}
    >
      {label || statusLabels[status]}
    </span>
  );
}
