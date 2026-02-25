'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PageContainer from '@/components/layout/PageContainer';
import toast from 'react-hot-toast';

// ✅ Centralized urgency styling
import { urgencyChipClasses, normalizeUrgency } from '@/lib/urgencyStyles';

import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/outline';

interface Need {
  id: string;
  title: string;
  description: string;
  status: string;
  need_type: string;
  urgency: string;
  created_at: string;
  submitted_at: string;

  approved_at: string | null;
  approved_by: string | null;

  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;

  claimed_at: string | null;
  claimed_by: string | null;
  claim_note: string | null;

  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  actual_hours_worked: number | null;
  actual_amount_provided: number | null;

  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;

  requester_user_id: string;
  organization_id: string;
  group_id: string | null;
  category_id: string | null;

  work_location: string | null;
  work_start_date: string | null;
  work_end_date: string | null;
  work_estimated_hours: number | null;
  work_skills_required: string[] | null;
  work_tools_needed: string[] | null;

  financial_amount: number | null;
  financial_currency: string | null;
  financial_purpose: string | null;
  financial_due_date: string | null;

  users: { id: string; full_name: string; email: string } | null;
  organizations: { display_name: string; primary_color: string } | null;
  groups: { name: string } | null;
  need_categories: { name: string } | null;

  approved_by_user?: { full_name: string } | null;
  rejected_by_user?: { full_name: string } | null;
  claimed_by_user?: { full_name: string; email: string } | null;
  completed_by_user?: { full_name: string; email: string } | null;
  cancelled_by_user?: { full_name: string } | null;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: { color: 'text-gray-700', bg: 'bg-gray-100', label: 'Draft' },
  PENDING_APPROVAL: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending Approval' },
  APPROVED_OPEN: { color: 'text-green-700', bg: 'bg-green-100', label: 'Open - Needs Help' },
  CLAIMED_IN_PROGRESS: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'In Progress' },
  COMPLETED: { color: 'text-purple-700', bg: 'bg-purple-100', label: 'Completed' },
  CANCELLED: { color: 'text-gray-700', bg: 'bg-gray-200', label: 'Cancelled' },
  REJECTED: { color: 'text-red-700', bg: 'bg-red-100', label: 'Rejected' },
};

function getNeedTypeLabel(needType: string) {
  switch (needType) {
    case 'WORK':
      return '🛠️ Work/Service';
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
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function normalizeJoin<T>(v: any): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return (v[0] ?? null) as T | null;
  return v as T;
}

export default function NeedDetailsPage() {
  const { user, loading: authLoading, isAdmin, isImpersonating, organization } = useAuth();
  const [need, setNeed] = useState<Need | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const params = useParams();
  const supabase = createClientComponentClient();
  const needId = params.id as string;

  useEffect(() => {
    const fetchNeed = async () => {
      try {
        const { data, error } = await supabase
          .from('needs')
          .select(
            `
            *,
            users:requester_user_id (id, full_name, email),
            organizations (display_name, primary_color),
            groups (name),
            need_categories (name),
            approved_by_user:approved_by (full_name),
            rejected_by_user:rejected_by (full_name),
            claimed_by_user:claimed_by (full_name, email),
            completed_by_user:completed_by (full_name, email),
            cancelled_by_user:cancelled_by (full_name)
          `
          )
          .eq('id', needId)
          .single();

        if (error) {
          const code = (error as any)?.code;
          const status = (error as any)?.status;

          if (code === 'PGRST116' || status === 406) {
            setNeed(null);
            return;
          }

          if (status === 401 || status === 403) {
            setNeed(null);
            toast.error('You do not have access to this need.');
            return;
          }

          throw error;
        }

        // UI-only impersonation guard
        if (
          isImpersonating &&
          organization?.id &&
          (data as any)?.organization_id &&
          (data as any).organization_id !== organization.id
        ) {
          setNeed(null);
          return;
        }

        const normalized: Need = {
          ...(data as any),
          users: normalizeJoin<Need['users']>((data as any).users),
          organizations: normalizeJoin<Need['organizations']>((data as any).organizations),
          groups: normalizeJoin<Need['groups']>((data as any).groups),
          need_categories: normalizeJoin<Need['need_categories']>((data as any).need_categories),
          approved_by_user: normalizeJoin<Need['approved_by_user']>((data as any).approved_by_user),
          rejected_by_user: normalizeJoin<Need['rejected_by_user']>((data as any).rejected_by_user),
          claimed_by_user: normalizeJoin<Need['claimed_by_user']>((data as any).claimed_by_user),
          completed_by_user: normalizeJoin<Need['completed_by_user']>((data as any).completed_by_user),
          cancelled_by_user: normalizeJoin<Need['cancelled_by_user']>((data as any).cancelled_by_user),
        };

        setNeed(normalized);
      } catch (error) {
        console.error('Error fetching need:', error);
        toast.error('Failed to load need details');
        setNeed(null);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user && needId) {
      fetchNeed();
    }
  }, [authLoading, user, needId, supabase, isImpersonating, organization?.id]);

  const handleClaim = async () => {
    if (!user || !need) return;

    const claimNote = prompt('Optional: add a note for the requester (e.g., when you can help):') || null;

    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('needs')
        .update({
          status: 'CLAIMED_IN_PROGRESS',
          claimed_at: now,
          claimed_by: user.id,
          claim_note: claimNote,
        })
        .eq('id', need.id);

      if (error) throw error;

      setNeed({
        ...need,
        status: 'CLAIMED_IN_PROGRESS',
        claimed_at: now,
        claimed_by: user.id,
        claim_note: claimNote,
        claimed_by_user: { full_name: user.full_name || '', email: user.email || '' },
      });

      toast.success('You have claimed this need! The requester will be notified.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim need');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!need || !user) return;

    const completionNote = prompt('Optional: add a completion note (what was done / outcome):') || null;

    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('needs')
        .update({
          status: 'COMPLETED',
          completed_at: now,
          completed_by: user.id,
          completion_note: completionNote,
        })
        .eq('id', need.id);

      if (error) throw error;

      setNeed({
        ...need,
        status: 'COMPLETED',
        completed_at: now,
        completed_by: user.id,
        completion_note: completionNote,
        completed_by_user: { full_name: user.full_name || '', email: user.email || '' },
      });

      toast.success('Need marked as completed!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete need');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !need) return;

    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('needs')
        .update({
          status: 'APPROVED_OPEN',
          approved_at: now,
          approved_by: user.id,
        })
        .eq('id', need.id);

      if (error) throw error;

      setNeed({
        ...need,
        status: 'APPROVED_OPEN',
        approved_at: now,
        approved_by: user.id,
        approved_by_user: { full_name: user.full_name || '' },
      });

      toast.success('Need approved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve need');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user || !need) return;

    const reason = prompt('Please provide a reason for rejection (optional):') || null;

    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('needs')
        .update({
          status: 'REJECTED',
          rejected_at: now,
          rejected_by: user.id,
          rejection_reason: reason,
        })
        .eq('id', need.id);

      if (error) throw error;

      setNeed({
        ...need,
        status: 'REJECTED',
        rejected_at: now,
        rejected_by: user.id,
        rejection_reason: reason,
        rejected_by_user: { full_name: user.full_name || '' },
      });

      toast.success('Need rejected');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject need');
    } finally {
      setProcessing(false);
    }
  };

  // ✅ MUST be above any conditional returns (Rules of Hooks)
  const lifecycle = useMemo(() => {
    if (!need) return [];
    const items: Array<{ title: string; when: string | null; who?: string | null; note?: string | null }> = [];

    items.push({
      title: 'Requested',
      when: need.submitted_at || need.created_at,
      who: need.users?.full_name || 'Unknown',
      note: null,
    });

    if (need.approved_at) {
      items.push({
        title: 'Approved',
        when: need.approved_at,
        who: need.approved_by_user?.full_name || 'Admin',
        note: null,
      });
    }

    if (need.rejected_at) {
      items.push({
        title: 'Rejected',
        when: need.rejected_at,
        who: need.rejected_by_user?.full_name || 'Admin',
        note: need.rejection_reason,
      });
    }

    if (need.cancelled_at) {
      items.push({
        title: 'Cancelled',
        when: need.cancelled_at,
        who: need.cancelled_by_user?.full_name || 'Admin',
        note: need.cancellation_reason,
      });
    }

    if (need.claimed_at) {
      items.push({
        title: 'Claimed / In Progress',
        when: need.claimed_at,
        who: need.claimed_by_user?.full_name || 'Volunteer',
        note: need.claim_note,
      });
    }

    if (need.completed_at) {
      items.push({
        title: 'Completed',
        when: need.completed_at,
        who: need.completed_by_user?.full_name || 'Volunteer',
        note: need.completion_note,
      });
    }

    return items;
  }, [need]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  if (!need) {
    return (
      <PageContainer title="Need Not Found">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">This need could not be found (or you don&apos;t have access to it).</p>
          <Link href="/needs" className="mt-4 inline-block">
            <Button>Back to Browse Needs</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const status = statusConfig[need.status] || statusConfig.DRAFT;

  // ✅ Correct + type-safe urgency normalization
  const urgencyKey = normalizeUrgency(need.urgency);
  const urgencyPillClass = urgencyChipClasses[urgencyKey];

  const isOwner = user?.id === need.requester_user_id;
  const isClaimedByMe = need.claimed_by === user?.id;
  const canClaim = need.status === 'APPROVED_OPEN' && !isOwner;
  const canComplete = need.status === 'CLAIMED_IN_PROGRESS' && (isClaimedByMe || isOwner || isAdmin);
  const canApprove = need.status === 'PENDING_APPROVAL' && isAdmin;

  const actionButtons = (
    <div className="flex gap-2">
      {canApprove && (
        <>
          <Button onClick={handleApprove} loading={processing}>
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button variant="danger" onClick={handleReject} loading={processing}>
            <XCircleIcon className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </>
      )}
      {canClaim && (
        <Button onClick={handleClaim} loading={processing} size="lg">
          <HandRaisedIcon className="h-5 w-5 mr-2" />
          I Can Help!
        </Button>
      )}
      {canComplete && (
        <Button onClick={handleMarkComplete} loading={processing}>
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          Mark Complete
        </Button>
      )}
    </div>
  );

  return (
    <PageContainer actions={actionButtons}>
      {/* Organization Banner */}
      <div
        className="rounded-lg p-4 mb-6"
        style={{
          backgroundColor: need.organizations?.primary_color ? `${need.organizations.primary_color}20` : '#f3f4f6',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: need.organizations?.primary_color || '#3b82f6' }}
          >
            {need.organizations?.display_name?.charAt(0) || 'O'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{need.organizations?.display_name || 'Organization'}</p>
            <p className="text-sm text-gray-500">{need.groups?.name || 'No group'}</p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Title Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{need.title}</h1>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}
                >
                  {status.label}
                </span>

                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${urgencyPillClass}`}>
                  {need.urgency} Urgency
                </span>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                  {getNeedTypeLabel(need.need_type)}
                </span>

                {need.need_categories?.name && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    {need.need_categories.name}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600">
                Requested by <span className="font-medium">{need.users?.full_name || 'Unknown'}</span>
                {need.users?.email ? <span className="text-gray-400"> • {need.users.email}</span> : null}
              </p>
            </div>
          </div>
        </div>

        {/* Claim CTA for open needs */}
        {canClaim && (
          <div className="p-6 bg-green-50 border-b border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-green-800">This person needs your help!</h2>
                <p className="text-green-600">Click the button to let them know you can assist.</p>
              </div>
              <Button onClick={handleClaim} loading={processing} size="lg">
                <HandRaisedIcon className="h-5 w-5 mr-2" />
                I Can Help!
              </Button>
            </div>
          </div>
        )}

        {/* In Progress Banner */}
        {need.status === 'CLAIMED_IN_PROGRESS' && need.claimed_by_user && (
          <div className="p-6 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-blue-800">Help is on the way!</h2>
                <p className="text-blue-600">
                  {isClaimedByMe
                    ? "You've claimed this need. Contact the requester to coordinate."
                    : `${need.claimed_by_user.full_name} is helping with this need.`}
                </p>
              </div>
              {canComplete && (
                <Button onClick={handleMarkComplete} loading={processing}>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Lifecycle Timeline */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lifecycle</h2>
          <div className="space-y-4">
            {lifecycle.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-gray-400 mt-1" />
                  {idx !== lifecycle.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.when && <p className="text-sm text-gray-500">• {formatDateTime(item.when)}</p>}
                  </div>
                  {item.who && <p className="text-sm text-gray-700 mt-1">By: {item.who}</p>}
                  {item.note && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{need.description}</p>
        </div>

        {/* Type-Specific Details */}
        {need.need_type === 'WORK' && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {need.work_location && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-gray-900">{need.work_location}</p>
                  </div>
                </div>
              )}
              {(need.work_start_date || need.work_end_date) && (
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Dates</p>
                    <p className="text-gray-900">
                      {need.work_start_date && new Date(need.work_start_date).toLocaleDateString()}
                      {need.work_start_date && need.work_end_date && ' - '}
                      {need.work_end_date && new Date(need.work_end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {need.work_estimated_hours && (
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Estimated Hours</p>
                    <p className="text-gray-900">{need.work_estimated_hours} hours</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {need.need_type === 'FINANCIAL' && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {need.financial_amount && (
                <div className="flex items-start gap-3">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Amount Needed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {need.financial_currency === 'USD' && '$'}
                      {need.financial_currency === 'EUR' && '€'}
                      {need.financial_currency === 'GBP' && '£'}
                      {need.financial_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {need.financial_due_date && (
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="text-gray-900">{new Date(need.financial_due_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
            {need.financial_purpose && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Purpose</p>
                <p className="text-gray-700">{need.financial_purpose}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}