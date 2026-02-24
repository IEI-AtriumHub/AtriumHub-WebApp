// ============================================================================
// NEED CARD COMPONENT
// ============================================================================

'use client';

import Link from 'next/link';
import { NeedWithRelations } from '@/types';
import { NeedStatusBadge } from '../ui/Badge';
import Card, { CardContent, CardFooter } from '../ui/Card';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { URGENCY_STYLES } from '@/lib/urgencyStyles';
import {
  ClockIcon,
  UserIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface NeedCardProps {
  need: NeedWithRelations;
  showGroup?: boolean;
  onClick?: () => void;
}

export function NeedCard({ need, showGroup = true, onClick }: NeedCardProps) {
  // Support multiple requester shapes depending on query aliasing:
  // - requester:requester_user_id (full_name, email)
  // - users:requester_user_id (full_name, email)
  const requesterName =
    (need as any)?.requester?.full_name ||
    (need as any)?.users?.full_name ||
    'Anonymous';

  const urgencyBarClass =
    URGENCY_STYLES[(need.urgency as keyof typeof URGENCY_STYLES) ?? 'LOW']?.bar ??
    URGENCY_STYLES.LOW.bar;

  const content = (
    <Card hover className={cn('border-l-4', urgencyBarClass)}>
      <CardContent>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{need.title}</h3>
            {showGroup && (need as any).group && (
              <p className="text-sm text-gray-500 mt-1">{(need as any).group.name}</p>
            )}
          </div>
          <NeedStatusBadge status={need.status} />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{need.description}</p>

        {/* Details */}
        <div className="space-y-2">
          {need.need_type === 'WORK' && (
            <>
              {(need as any).work_location && (
                <div className="flex items-center text-sm text-gray-500">
                  <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{(need as any).work_location}</span>
                </div>
              )}
              {(need as any).work_estimated_hours && (
                <div className="flex items-center text-sm text-gray-500">
                  <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{(need as any).work_estimated_hours} hours estimated</span>
                </div>
              )}
              {(need as any).work_start_date && (
                <div className="flex items-center text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Starts {formatDate((need as any).work_start_date)}</span>
                </div>
              )}
            </>
          )}

          {need.need_type === 'FINANCIAL' && (
            <>
              {(need as any).financial_amount && (
                <div className="flex items-center text-sm font-semibold text-gray-900">
                  <CurrencyDollarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>
                    {formatCurrency(
                      (need as any).financial_amount,
                      (need as any).financial_currency ?? undefined
                    )}
                  </span>
                </div>
              )}
              {(need as any).financial_due_date && (
                <div className="flex items-center text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Due {formatDate((need as any).financial_due_date)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center text-sm text-gray-500">
            <UserIcon className="h-4 w-4 mr-1" />
            <span>{requesterName}</span>
          </div>
          <span className="text-xs text-gray-400">{formatDate(need.created_at)}</span>
        </div>
      </CardFooter>
    </Card>
  );

  // If an onClick is provided, render a button wrapper (not a Link)
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left cursor-pointer">
        {content}
      </button>
    );
  }

  // Otherwise render as a Link wrapper
  return (
    <Link href={`/needs/${need.id}`} className="block">
      {content}
    </Link>
  );
}

export default NeedCard;