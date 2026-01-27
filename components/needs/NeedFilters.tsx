// ============================================================================
// NEED FILTERS COMPONENT
// ============================================================================

'use client';

import { useState } from 'react';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { NeedType, NeedStatus, UrgencyLevel } from '@/types';
import { useGroups } from '@/hooks';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface NeedFiltersProps {
  onFilterChange: (filters: NeedFilterValues) => void;
}

export interface NeedFilterValues {
  search?: string;
  needType?: NeedType | '';
  status?: NeedStatus | '';
  groupId?: string;
  urgency?: UrgencyLevel | '';
}

export function NeedFilters({ onFilterChange }: NeedFiltersProps) {
  const { groups } = useGroups();
  const [filters, setFilters] = useState<NeedFilterValues>({
    search: '',
    needType: '',
    status: '',
    groupId: '',
    urgency: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof NeedFilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: NeedFilterValues = {
      search: '',
      needType: '',
      status: '',
      groupId: '',
      urgency: '',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Search */}
      <Input
        placeholder="Search needs..."
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.target.value)}
        leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
      />

      {/* Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          placeholder="All Types"
          value={filters.needType}
          onChange={(e) => handleFilterChange('needType', e.target.value)}
          options={[
            { value: '', label: 'All Types' },
            { value: 'WORK', label: 'Work' },
            { value: 'FINANCIAL', label: 'Financial' },
          ]}
        />

        <Select
          placeholder="All Statuses"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'APPROVED_OPEN', label: 'Open' },
            { value: 'CLAIMED_IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
          ]}
        />

        <Select
          placeholder="All Groups"
          value={filters.groupId}
          onChange={(e) => handleFilterChange('groupId', e.target.value)}
          options={[
            { value: '', label: 'All Groups' },
            ...groups.map((g) => ({ value: g.id, label: g.name })),
          ]}
        />

        <Select
          placeholder="All Urgencies"
          value={filters.urgency}
          onChange={(e) => handleFilterChange('urgency', e.target.value)}
          options={[
            { value: '', label: 'All Urgencies' },
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' },
          ]}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <FunnelIcon className="h-4 w-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
        </Button>

        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset Filters
        </Button>
      </div>

      {/* Advanced Filters (if needed in future) */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Additional filters coming soon...
          </p>
        </div>
      )}
    </div>
  );
}

export default NeedFilters;
