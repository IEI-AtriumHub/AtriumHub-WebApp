'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PageContainer from '@/components/layout/PageContainer';

interface PersonLite {
  full_name: string;
  email?: string | null;
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

  requester: PersonLite | null;
  helper: PersonLite | null;

  organizations: { display_name: string } | null;
  groups: { name: string } | null; // needs.group_id -> groups.name
}

const urgencyChipColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const urgencyBarColors: Record<string, string> = {
  LOW: 'bg-gray-300',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

function getNeedTypeLabel(needType: string) {
  switch (needType) {
    case 'WORK':
      return 'WORK';
    case 'FINANCIAL':
      return 'FINANCIAL';
    case 'EVENT':
      return 'EVENT';
    case 'REQUEST':
      return 'REQUEST';
    default:
      return needType;
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

  const effectiveIsSuperAdmin = useMemo(
    () => isSuperAdmin && !isImpersonating,
    [isSuperAdmin, isImpersonating]
  );

  useEffect(() => {
    const fetchNeeds = async () => {
      try {
        setLoading(true);
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
            requester:requester_user_id (full_name, email),
            helper:claimed_by (full_name, email),
            organizations (display_name),
            groups:group_id (name)
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
          requester: normalizeOne<PersonLite>(n.requester),
          helper: normalizeOne<PersonLite>(n.helper),
          organizations: normalizeOne<{ display_name: string }>(n.organizations),
          groups: normalizeOne<{ name: string }>(n.groups),
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
            const orgName = need.organizations?.display_name || 'Unknown organization';
            const groupName = need.groups?.name || 'No group';

            const requesterName = need.requester?.full_name?.trim() || 'Unknown';
            const helperName = need.helper?.full_name?.trim() || 'Unassigned';

            const bar = urgencyBarColors[need.urgency] || 'bg-gray-300';

            return (
              <Link key={need.id} href={`/needs/${need.id}`} className="block">
                {/* Card layout aligned with My Needs / Browse Needs */}
                <div className="bg-white rounded-lg shadow p-0 hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex">
                    {/* Left urgency bar */}
                    <div className={`w-1 ${bar}`} />

                    <div className="flex-1 p-6 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        {/* Main content */}
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{need.title}</h3>

                          <p className="text-sm text-gray-500 mt-1">
                            {orgName} • {groupName}
                          </p>

                          <div className="mt-3 text-sm text-gray-700 space-y-1">
                            <div>
                              Requested by <span className="font-medium">{requesterName}</span>
                            </div>
                            <div>
                              Claimed by <span className="font-medium">{helperName}</span>
                            </div>
                          </div>

                          <p className="text-gray-600 mt-3 line-clamp-2 break-words">{need.description}</p>
                        </div>

                        {/* Right chips */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              urgencyChipColors[need.urgency] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {need.urgency}
                          </span>

                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            {getNeedTypeLabel(need.need_type)}
                          </span>
                        </div>
                      </div>

                      {/* Footer: stacked dates + call-to-action (card itself is clickable) */}
                      <div className="mt-4 text-sm space-y-1">
                        <div className="text-gray-400">Created: {formatDate(need.created_at)}</div>
                        <div className="text-gray-400">
                          Claimed: {need.claimed_at ? formatDate(need.claimed_at) : '—'}
                        </div>
                        <div className="text-blue-600 font-medium mt-2">View Details →</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
