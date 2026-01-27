'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PageContainer from '@/components/layout/PageContainer';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Need {
  id: string;
  title: string;
  description: string;
  status: string;
  need_type: string;
  urgency: string;
  created_at: string;
  submitted_at: string;
  organizations?: {
    display_name: string;
  };
  groups?: {
    name: string;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED_OPEN: 'bg-green-100 text-green-800',
  CLAIMED_IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED_OPEN: 'Approved',
  CLAIMED_IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const urgencyColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function MyNeedsPage() {
  const { user, loading: authLoading } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchMyNeeds = async () => {
      if (!user) return;

      try {
        let query = supabase
          .from('needs')
          .select(`
            id,
            title,
            description,
            status,
            need_type,
            urgency,
            created_at,
            submitted_at,
            organizations (display_name),
            groups (name)
          `)
          .eq('requester_user_id', user.id)
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data, error } = await query;

        if (error) throw error;
        setNeeds(data || []);
      } catch (error) {
        console.error('Error fetching needs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchMyNeeds();
    }
  }, [authLoading, user, filter, supabase]);

  if (loading) {
    return (
      <PageContainer title="My Needs" description="View and manage your requested needs">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="My Needs"
      description="View and manage your requested needs"
      actions={
        <Link href="/needs/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Need
          </Button>
        </Link>
      }
    >
      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All' },
          { value: 'PENDING_APPROVAL', label: 'Pending' },
          { value: 'APPROVED_OPEN', label: 'Approved' },
          { value: 'CLAIMED_IN_PROGRESS', label: 'In Progress' },
          { value: 'COMPLETED', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Needs List */}
      {needs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">
            {filter === 'all'
              ? "You haven't created any needs yet."
              : `No needs with status "${statusLabels[filter] || filter}".`}
          </p>
          <Link href="/needs/new" className="mt-4 inline-block">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Your First Need
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {needs.map((need) => (
            <Link key={need.id} href={`/needs/${need.id}`} className="block">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{need.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[need.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[need.status] || need.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {need.organizations?.display_name} • {need.groups?.name || 'No group'}
                    </p>
                    <p className="text-gray-600 line-clamp-2">{need.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyColors[need.urgency] || 'bg-gray-100 text-gray-600'}`}>
                      {need.urgency}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {need.need_type}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center text-sm">
                  <span className="text-gray-400">
                    Submitted: {need.submitted_at ? new Date(need.submitted_at).toLocaleDateString() : 'Draft'}
                  </span>
                  <span className="text-blue-600">View Details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}