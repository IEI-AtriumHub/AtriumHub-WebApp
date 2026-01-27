'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BuildingOfficeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  display_name: string;
  slug: string;
}

interface OrgSelectorProps {
  selectedOrgId: string; // 'ALL' or an org ID
  onOrgChange: (orgId: string) => void;
  disabled?: boolean;
}

export default function OrgSelector({ selectedOrgId, onOrgChange, disabled }: OrgSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, display_name, slug')
          .order('display_name');

        if (error) throw error;
        setOrganizations(data || []);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, [supabase]);

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);
  const displayText = selectedOrgId === 'ALL' 
    ? 'All Organizations' 
    : selectedOrg?.display_name || 'Select Organization';

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
        <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
        <span className="text-purple-700">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
        <span className="text-purple-700 font-medium">{displayText}</span>
        <ChevronDownIcon className={`h-4 w-4 text-purple-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            {/* All Organizations Option */}
            <button
              onClick={() => {
                onOrgChange('ALL');
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 ${
                selectedOrgId === 'ALL' ? 'bg-purple-50' : ''
              }`}
            >
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <BuildingOfficeIcon className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">All Organizations</div>
                <div className="text-xs text-gray-500">View data from all orgs</div>
              </div>
              {selectedOrgId === 'ALL' && (
                <div className="ml-auto">
                  <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
                </div>
              )}
            </button>

            {/* Individual Organizations */}
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onOrgChange(org.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 ${
                  selectedOrgId === org.id ? 'bg-purple-50' : ''
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {org.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{org.display_name}</div>
                  <div className="text-xs text-gray-500">{org.slug}</div>
                </div>
                {selectedOrgId === org.id && (
                  <div className="ml-auto">
                    <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}