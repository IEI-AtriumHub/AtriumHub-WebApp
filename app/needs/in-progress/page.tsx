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

  requester: PersonWithGroup | null;
  helper: PersonWithGroup | null;

  organizations: { display_name: string } | null;
  groups: { name: string } | null;
  need_categories: { name: string } | null;
}

const urgencyBarColors: Record<string, string> = {
  LOW: 'bg-gray-300',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
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

function normalizeOne<T>(value: any): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function NeedsInProgressPage() {
  const { user, loading: authLoading, organization, isSuperAdmin, isImpersonating } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClientComponentClient(), []);
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
            requester:requester_user_id (full_name,email),
            helper:claimed_by (full_name,email),
            organizations (display_name),
            groups (name),
            need_categories:category_id (name)
          `
          )
          .eq('status', 'CLAIMED_IN_PROGRESS')
          .order('claimed_at', { ascending: false })
          .order('created_at', { ascending: false });

        if (!effectiveIsSuperAdmin && organization?.id) {
          query = query.eq('organization_id', organization.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const normalized: Need[] = (data || []).map((n: any) => ({
          ...n,
          requester: normalizeOne<PersonWithGroup>(n.requester),
          helper: normalizeOne<PersonWithGroup>(n.helper),
          organizations: normalizeOne<{ display_name: string }>(n.organizations),
          groups: normalizeOne<{ name: string }>(n.groups),
          need_categories: normalizeOne<{ name: string }>(n.need_categories),
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

    if (!authLoading) fetchNeeds();
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
        </div>
      ) : (
        <div className="grid gap-4">
          {needs.map((need) => {
            const bar = urgencyBarColors[need.urgency] || 'bg-gray-300';

            const orgName = need.organizations?.display_name || 'Organization';
            const needGroupName = need.groups?.name || 'No group';

            const requesterName = need.requester?.full_name || 'Unknown';
            const helperName = need.helper?.full_name || 'Unassigned';

            return (
              <div key={need.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {/* Urgency color bar */}
                  <div className={`w-1 rounded-full ${bar}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{need.title}</h3>
                          <span className="text-xs text-gray-500">{getNeedTypeLabel(need.need_type)}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{need.urgency}</span>
                        </div>

                        <p className="text-sm text-gray-500 mt-1">
                          {orgName} • {needGroupName}
                        </p>

                        <div className="mt-3 text-sm text-gray-700 space-y-1">
                          <div>
                            Requested by <span className="font-medium">{requesterName}</span>
                          </div>
                          <div>
                            Claimed by <span className="font-medium">{helperName}</span>
                          </div>
                        </div>

                        <p className="text-gray-600 mt-3 line-clamp-2">{need.description}</p>

                        <p className="text-xs text-gray-400 mt-3">
                          Claimed {formatDateTime(need.claimed_at)} • Created {formatDate(need.created_at)}
                        </p>
                      </div>

                      <Link href={`/needs/${need.id}`}>
                        <Button size="sm">
                          <HandRaisedIcon className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
