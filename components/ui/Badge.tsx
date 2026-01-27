// ============================================================================
// BADGE COMPONENT
// ============================================================================

import { cn } from '@/lib/utils';
import { NeedStatus, UserStatus, STATUS_COLORS, USER_STATUS_COLORS } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variantStyles = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };
  
  return (
    <span className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </span>
  );
}

// Specialized status badges
export function NeedStatusBadge({ status }: { status: NeedStatus }) {
  const displayNames: Record<NeedStatus, string> = {
    DRAFT: 'Draft',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED_OPEN: 'Open',
    CLAIMED_IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
  };
  
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium', STATUS_COLORS[status])}>
      {displayNames[status]}
    </span>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const displayNames: Record<UserStatus, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    DISABLED: 'Disabled',
  };
  
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium', USER_STATUS_COLORS[status])}>
      {displayNames[status]}
    </span>
  );
}

export default Badge;
