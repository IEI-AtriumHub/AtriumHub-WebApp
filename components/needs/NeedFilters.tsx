// ============================================================================
// NEED FILTERS COMPONENT
// ============================================================================

'use client';

import { ChangeEvent } from 'react';
import { NeedType } from '@/types';
import Select from '@/components/ui/Select';

interface NeedFiltersState {
  search: string;
  needType: '' | NeedType;
  urgency: '' | string;
  status: '' | string;
}

interface NeedFiltersProps {
  filters: NeedFiltersState;
  onChange: (filters: NeedFiltersState) => void;
}

export function NeedFilters({ filters, onChange }: NeedFiltersProps) {
  const handleFilterChange = (key: keyof NeedFiltersState, value: string) => {
    onChange({
      ...filters,
      [key]: value,
    } as NeedFiltersState);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Need Type */}
        <Select
          value={filters.needType}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            handleFilterChange('needType', e.target.value)
          }
          options={[
            { value: '', label: 'All Types' },
            { value: 'WORK', label: '🛠️ Work' },
            { value: 'FINANCIAL', label: '💰 Financial' },
            { value: 'EVENT', label: '📅 Event' },
            { value: 'REQUEST', label: '🙋 Request' },
          ]}
        />

        {/* Urgency */}
        <Select
          value={filters.urgency}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            handleFilterChange('urgency', e.target.value)
          }
          options={[
            { value: '', label: 'All Urgency' },
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' },
          ]}
        />

        {/* Status */}
        <Select
          value={filters.status}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            handleFilterChange('status', e.target.value)
          }
          options={[
            { value: '', label: 'All Status' },
            { value: 'APPROVED_OPEN', label: 'Open' },
            { value: 'CLAIMED_IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
          ]}
        />

        {/* Search */}
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Search needs..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

export default NeedFilters;
