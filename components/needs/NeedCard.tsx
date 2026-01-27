// ============================================================================
// NEED CARD COMPONENT
// ============================================================================

'use client';

import Link from 'next/link';
import { NeedWithRelations } from '@/types';
import { NeedStatusBadge } from '../ui/Badge';
import Card, { CardContent, CardFooter } from '../ui/Card';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
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
  const urgencyColors = {
    LOW: 'border-l-gray-400',
    MEDIUM: 'border-l-blue-400',
    HIGH: 'border-l-orange-400',
    CRITICAL: 'border-l-red-400',
  };

  const CardWrapper = onClick ? 'div' : Link;
  const cardProps = onClick
    ? { onClick, className: 'cursor-pointer' }
    : { href: `/needs/${need.id}` };

  return (
    <CardWrapper {...cardProps}>
      <Card
        hover
        className={cn('border-l-4', urgencyColors[need.urgency])}
      >
        <CardContent>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {need.title}
              </h3>
              {showGroup && need.group && (
                <p className="text-sm text-gray-500 mt-1">
                  {need.group.name}
                </p>
              )}
            </div>
            <NeedStatusBadge status={need.status} />
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {need.description}
          </p>

          {/* Details */}
          <div className="space-y-2">
            {need.need_type === 'WORK' && (
              <>
                {need.work_location && (
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{need.work_location}</span>
                  </div>
                )}
                {need.work_estimated_hours && (
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{need.work_estimated_hours} hours estimated</span>
                  </div>
                )}
                {need.work_start_date && (
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Starts {formatDate(need.work_start_date)}</span>
                  </div>
                )}
              </>
            )}

            {need.need_type === 'FINANCIAL' && (
              <>
                {need.financial_amount && (
                  <div className="flex items-center text-sm font-semibold text-gray-900">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      {formatCurrency(need.financial_amount, need.financial_currency)}
                    </span>
                  </div>
                )}
                {need.financial_due_date && (
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Due {formatDate(need.financial_due_date)}</span>
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
              <span>
                {need.requester_name || 'Anonymous'}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {formatDate(need.created_at)}
            </span>
          </div>
        </CardFooter>
      </Card>
    </CardWrapper>
  );
}

export default NeedCard;
