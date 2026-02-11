'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PageContainer from '@/components/layout/PageContainer';
import { HandRaisedIcon } from '@heroicons/react/24/outline';

interface PersonWithGroup {
  full_name: string;
  email?: string | null;
  groups?: { name: string } | null;
}

interface Need {
  id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  need_type: string;
  created_at: string;
  claimed_at: string | null;
  requester_user_id: string;
  claimed_by: string | null;

  // Joins (normalize arrays -> single object)
  requester: PersonWithGroup | null;
  helper: PersonWithGroup | null;

  organizations: { display_name: string } | null;
  groups: { name: string } | null; // need.group_id -> groups(name)
  need_categories: { name: string } | null;
}

const urgencyColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

function getNeedTypeLabel(needType: string) {
  switch (needType) {
    case 'WORK':
      return '🛠️ Work';
    case 'FINANCIAL':
      return '💰 Financial';
    case 'EVENT':
      return '📅 Event';
    case 'REQUEST':
      return '🙋 Request';
    default:
      return needType;
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '—';
  }
}

export default function NeedsInProgressPage() {
  const { user, loading: authLoading, organization, isSuperAdmin, isImpersonating } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  // In impersonation mode, behave like the impersonated org user.
  const effectiveIsSuperAdmin = useMemo(() => isSuperAdmin && !isImpersonating, [isSuperAdmin, isImpersonating]);

  useEffect(() => {
    const fetchNeeds = async () => {
      try {
        if (!user) return;

        if (!effectiveIsSuperAdmin && !organization?.id) {
          setNeeds([]);
          setError('No organization selected or assigned for this user.');
          return;
        }

        let query = supabase
          .from('needs')
          .select(
            `
            id,
            title,
            description,
            status,
            urgency,
            need_type,
            created_at,
            claimed_at,
            requester_user_id,
            claimed_by,
            requester:requester_user_id (
              full_name,
              email,
              groups (name)
            ),
            helper:claimed_by (
              full_name,
              email,
              groups (name)
            ),
            organizations (display_name),
            groups (name),
            need_categories:category_id (name)
          `
          )
          .eq('status', 'CLAIMED_IN_PROGRESS')
          .order('claimed_at', { ascending: false })
          .order('created_at', { ascending: false });

        // Tenant isolation in UI for normal users and while impersonating
        if (!effectiveIsSuperAdmin && organization?.id) {
          query = query.eq('organization_id', organization.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const normalized: Need[] = (data || []).map((n: any) => ({
          ...n,
          requester: Array.isArray(n.requester) ? (n.requester[0] ?? null) : (n.requester ?? null),
          helper: Array.isArray(n.helper) ? (n.helper[0] ?? null) : (n.helper ?? null),
          organizations: Array.isArray(n.organizations) ? (n.organizations[0] ?? null) : (n.organizations ?? null),
          groups: Array.isArray(n.groups) ? (n.groups[0] ?? null) : (n.groups ?? null),
          need_categories: Array.isArray(n.need_categories) ? (n.need_categories[0] ?? null) : (n.need_categories ?? null),
        }));

        setNeeds(normalized);
        setError(null);
      } catch (e: any) {
        console.error('Error fetching in-progress needs:', e);
        setError(e?.message || 'Failed to load in-progress needs');
        setNeeds([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchNeeds();
    }
  }, [authLoading, user, organization?.id, effectiveIsSuperAdmin, supabase]);

  if (authLoading || loading) {
    return (
      <PageContainer title="In Progress Needs" description="Needs currently being worked on">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="In Progress Needs"
      description="Needs currently being worked on in your community"
      actions={
        <div className="flex gap-2">
          <Link href="/needs">
            <Button variant="outline">Browse Open Needs</Button>
          </Link>
          <Link href="/needs/new">
            <Button>Create Need</Button>
          </Link>
        </div>
      }
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {needs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <HandRaisedIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No needs are currently in progress.</p>
          <p className="text-gray-400 mt-2">When someone claims a need, it will appear here.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/needs">
              <Button variant="outline">Browse Open Needs</Button>
            </Link>
            <Link href="/needs/new">
              <Button>Create a Need</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {needs.map((need) => {
            const orgName = need.organizations?.display_name || 'Organization';
            const needGroupName = need.groups?.name || 'No group';

            const requesterName = need.requester?.full_name || 'Unknown';
            const requesterEmail = need.requester?.email || null;
            const requesterGroup = need.requester?.groups?.name || 'No group';

            const helperName = need.helper?.full_name || 'Unassigned';
            const helperEmail = need.helper?.email || null;
            const helperGroup = need.helper?.groups?.name || 'No group';

            return (
              <div key={need.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{need.title}</h3>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          urgencyColors[need.urgency] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {need.urgency}
                      </span>

                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {getNeedTypeLabel(need.need_type)}
                      </span>

                      {need.need_categories?.name && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {need.need_categories.name}
                        </span>
                      )}
                    </div>

                    {/* Org + Need Group + timestamps */}
                    <p className="text-sm text-gray-500 mb-2">
                      {orgName} • {needGroupName} • Claimed {formatDateTime(need.claimed_at)} • Created {formatDate(need.created_at)}
                    </p>

                    <p className="text-gray-600 line-clamp-2">{need.description}</p>

                    {/* People + their groups */}
                    <div className="mt-3 text-sm text-gray-700 space-y-1">
                      <div>
                        <span className="text-gray-500">Requested by:</span>{' '}
                        <span className="font-medium">{requesterName}</span>
                        {requesterEmail ? <span className="text-gray-500"> ({requesterEmail})</span> : null}
                        <span className="text-gray-500"> • </span>
                        <span className="text-gray-500">Group:</span>{' '}
                        <span className="font-medium">{requesterGroup}</span>
                      </div>

                      <div>
                        <span className="text-gray-500">Helping:</span>{' '}
                        <span className="font-medium">{helperName}</span>
                        {helperEmail ? <span className="text-gray-500"> ({helperEmail})</span> : null}
                        <span className="text-gray-500"> • </span>
                        <span className="text-gray-500">Group:</span>{' '}
                        <span className="font-medium">{helperGroup}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end gap-2">
                    <Link href={`/needs/${need.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Link href={`/needs/${need.id}`}>
                    <Button size="sm">Open</Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
