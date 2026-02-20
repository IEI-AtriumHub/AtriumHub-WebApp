'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PageContainer from '@/components/layout/PageContainer';
import { PlusIcon, HandRaisedIcon } from '@heroicons/react/24/outline';

interface Need {
  id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  need_type: string;
  created_at: string;
  requester_user_id: string;

  // Tenant context
  organizations: { display_name: string } | null;

  // Required identity context
  users: { id?: string; full_name: string } | null;

  // Reporting/filters context
  groups: { name: string } | null;
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

function normalizeOne<T>(value: any): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function shortId(id: string | null | undefined) {
  if (!id) return '';
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export default function NeedsPage() {
  const { user, organization, loading: authLoading, isSuperAdmin } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClientComponentClient(), []);

  useEffect(() => {
    const fetchNeeds = async () => {
      setLoading(true);
      try {
        // Require org context for non-superadmin users
        if (!isSuperAdmin && !organization?.id) {
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
            requester_user_id,
            users:requester_user_id (id, full_name),
            organizations (display_name),
            groups:group_id (name),
            need_categories:category_id (name)
          `
          )
          .eq('status', 'APPROVED_OPEN')
          .order('created_at', { ascending: false });

        // Tenant isolation in the UI: normal users only see needs in their org
        if (!isSuperAdmin && organization?.id) {
          query = query.eq('organization_id', organization.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        const normalized: Need[] = (data || []).map((n: any) => ({
          ...n,
          users: normalizeOne<{ id?: string; full_name: string }>(n.users),
          organizations: normalizeOne<{ display_name: string }>(n.organizations),
          groups: normalizeOne<{ name: string }>(n.groups),
          need_categories: normalizeOne<{ name: string }>(n.need_categories),
        }));

        setNeeds(normalized);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching needs:', err);
        setError(err?.message || 'Failed to load needs');
        setNeeds([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchNeeds();
    }
  }, [authLoading, user, organization?.id, isSuperAdmin, supabase]);

  if (loading) {
    return (
      <PageContainer title="Browse Needs" description="View and claim available needs">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Browse Needs"
      description="View and claim available needs in your community"
      actions={
        <Link href="/needs/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Need
          </Button>
        </Link>
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
          <p className="text-gray-500 text-lg">No needs available at the moment.</p>
          <p className="text-gray-400 mt-2">Check back later or create your own need.</p>
          <Link href="/needs/new" className="mt-4 inline-block">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create a Need
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {needs.map((need) => {
            const groupName = need.groups?.name || 'No group';
            const orgName = need.organizations?.display_name || 'Unknown organization';

            // Truthful label:
            // - If join returns a name, show it.
            // - If not, don’t pretend it’s “Unknown” — it’s either missing data or blocked by RLS.
            const requesterLabel =
              need.users?.full_name?.trim()
                ? need.users.full_name
                : need.requester_user_id
                  ? `Hidden (RLS) • ${shortId(need.requester_user_id)}`
                  : 'Missing requester';

            return (
              <div
                key={need.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
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

                      {need.need_categories?.name ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {need.need_categories.name}
                        </span>
                      ) : null}
                    </div>

                    {/* Always show Org + Group + Requested By */}
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium text-gray-800">{orgName}</span>
                      {' • '}
                      <span className="font-medium text-gray-800">{groupName}</span>
                      {' • '}
                      <span className="text-gray-600">
                        Requested by <span className="font-medium">{requesterLabel}</span>
                      </span>
                    </p>

                    <p className="text-gray-600 line-clamp-2">{need.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    {new Date(need.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex gap-2">
                    {user?.id !== need.requester_user_id && (
                      <Link href={`/needs/${need.id}`}>
                        <Button size="sm">
                          <HandRaisedIcon className="h-4 w-4 mr-1" />
                          I Can Help
                        </Button>
                      </Link>
                    )}

                    <Link href={`/needs/${need.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
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