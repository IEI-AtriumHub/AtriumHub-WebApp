// ============================================================================
// BADGE COMPONENTS
// ============================================================================

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { NeedStatus, UserStatus } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * These are defined locally because "@/types" does NOT export STATUS_COLORS or USER_STATUS_COLORS.
 * (Your build errors confirm that.)
 */
const NEED_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED_OPEN: 'bg-green-100 text-green-800',
  CLAIMED_IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
  ARCHIVED: 'bg-gray-100 text-gray-700',
};

const USER_STATUS_COLORS_LOCAL: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DISABLED: 'bg-gray-100 text-gray-800',
};

export function NeedStatusBadge({ status }: { status: NeedStatus | string }) {
  const classes = NEED_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return <Badge className={classes}>{status}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus | string }) {
  const classes = USER_STATUS_COLORS_LOCAL[status] || 'bg-gray-100 text-gray-800';
  return <Badge className={classes}>{status}</Badge>;
}

export default Badge;
