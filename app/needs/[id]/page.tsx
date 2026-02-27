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
  PencilSquareIcon,
  XMarkIcon,
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
  work_start_date: string | null; // date (YYYY-MM-DD)
  work_end_date: string | null; // date (YYYY-MM-DD)
  work_estimated_hours: number | null;
  work_skills_required: string[] | null;
  work_tools_needed: string[] | null;

  financial_amount: number | null;
  financial_currency: string | null;
  financial_purpose: string | null;
  financial_due_date: string | null; // date (YYYY-MM-DD)

  event_date: string | null; // timestamptz
  event_end_date: string | null; // timestamptz
  event_location: string | null;
  event_max_attendees: number | null;
  event_rsvp_required: boolean | null;

  users: { id: string; full_name: string; email: string } | null;
  organizations: { display_name: string; primary_color: string } | null;
  groups: { id?: string; name: string } | null;
  need_categories: { id?: string; name: string } | null;

  approved_by_user?: { full_name: string } | null;
  rejected_by_user?: { full_name: string } | null;
  claimed_by_user?: { full_name: string; email: string } | null;
  completed_by_user?: { full_name: string; email: string } | null;
  cancelled_by_user?: { full_name: string } | null;
}

type SelectOption = { id: string; name: string };

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

/** Convert ISO datetime -> value for <input type="datetime-local"> (local) */
function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Convert datetime-local value -> ISO string */
function fromDateTimeLocalValue(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function NeedDetailsPage() {
  const { user, loading: authLoading, isAdmin, isImpersonating, organization } = useAuth();
  const [need, setNeed] = useState<Need | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [groupsOptions, setGroupsOptions] = useState<SelectOption[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<SelectOption[]>([]);
  const [editLoadingOptions, setEditLoadingOptions] = useState(false);

  const params = useParams();
  const supabase = createClientComponentClient();
  const needId = params.id as string;

  // Edit form fields
  const [form, setForm] = useState({
    title: '',
    description: '',
    group_id: '',
    category_id: '',

    work_location: '',
    work_start_date: '',
    work_end_date: '',
    work_estimated_hours: '',
    work_skills_required: '',
    work_tools_needed: '',

    financial_amount: '',
    financial_currency: '',
    financial_purpose: '',
    financial_due_date: '',

    event_date: '',
    event_end_date: '',
    event_location: '',
    event_max_attendees: '',
    event_rsvp_required: false,
  });

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
            groups (id, name),
            need_categories (id, name),
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

  const canAdminEdit = !!need && need.status === 'PENDING_APPROVAL' && isAdmin;

  const openEditModal = async () => {
    if (!need) return;

    // Initialize form from current need (so the modal is pre-filled)
    setForm({
      title: need.title ?? '',
      description: need.description ?? '',
      group_id: need.group_id ?? '',
      category_id: need.category_id ?? '',

      work_location: need.work_location ?? '',
      work_start_date: need.work_start_date ?? '',
      work_end_date: need.work_end_date ?? '',
      work_estimated_hours: need.work_estimated_hours != null ? String(need.work_estimated_hours) : '',
      work_skills_required: Array.isArray(need.work_skills_required) ? need.work_skills_required.join(', ') : '',
      work_tools_needed: Array.isArray(need.work_tools_needed) ? need.work_tools_needed.join(', ') : '',

      financial_amount: need.financial_amount != null ? String(need.financial_amount) : '',
      financial_currency: need.financial_currency ?? '',
      financial_purpose: need.financial_purpose ?? '',
      financial_due_date: need.financial_due_date ?? '',

      event_date: toDateTimeLocalValue(need.event_date),
      event_end_date: toDateTimeLocalValue(need.event_end_date),
      event_location: need.event_location ?? '',
      event_max_attendees: need.event_max_attendees != null ? String(need.event_max_attendees) : '',
      event_rsvp_required: !!need.event_rsvp_required,
    });

    setEditOpen(true);

    // Load group/category options for dropdowns (nice UX)
    setEditLoadingOptions(true);
    try {
      const orgId = need.organization_id;

      const [{ data: groupsData, error: groupsError }, { data: catsData, error: catsError }] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name')
          .eq('organization_id', orgId)
          .order('name', { ascending: true }),
        supabase
          .from('need_categories')
          .select('id, name')
          .eq('organization_id', orgId)
          .order('name', { ascending: true }),
      ]);

      if (groupsError) console.warn('groups options load error:', groupsError);
      if (catsError) console.warn('need_categories options load error:', catsError);

      setGroupsOptions((groupsData ?? []) as SelectOption[]);
      setCategoriesOptions((catsData ?? []) as SelectOption[]);
    } catch (e) {
      console.warn('Failed to load edit options:', e);
    } finally {
      setEditLoadingOptions(false);
    }
  };

  const closeEditModal = () => setEditOpen(false);

  const handleSaveEdit = async () => {
    if (!need) return;

    setProcessing(true);
    try {
      // Build RPC params
      const params = {
        need_uuid: need.id,

        p_title: form.title,
        p_description: form.description,

        p_group_id: form.group_id || null,
        p_category_id: form.category_id || null,

        p_work_location: form.work_location || null,
        p_work_start_date: form.work_start_date || null,
        p_work_end_date: form.work_end_date || null,
        p_work_estimated_hours: form.work_estimated_hours !== '' ? Number(form.work_estimated_hours) : null,
        p_work_skills_required:
          form.work_skills_required.trim() !== ''
            ? form.work_skills_required
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : null,
        p_work_tools_needed:
          form.work_tools_needed.trim() !== ''
            ? form.work_tools_needed
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : null,

        p_financial_amount: form.financial_amount !== '' ? Number(form.financial_amount) : null,
        p_financial_currency: form.financial_currency || null,
        p_financial_purpose: form.financial_purpose || null,
        p_financial_due_date: form.financial_due_date || null,

        p_event_date: fromDateTimeLocalValue(form.event_date),
        p_event_end_date: fromDateTimeLocalValue(form.event_end_date),
        p_event_location: form.event_location || null,
        p_event_max_attendees: form.event_max_attendees !== '' ? Number(form.event_max_attendees) : null,
        p_event_rsvp_required: form.event_rsvp_required,
      };

      const { data, error } = await supabase.rpc('admin_edit_need_pending', params);

      if (error) {
        console.error('admin_edit_need_pending error:', error);
        throw error;
      }

      // Depending on PostgREST, data might be object or array; normalize
      const updatedRow = Array.isArray(data) ? data[0] : data;
      if (!updatedRow) {
        toast.success('Saved.');
        closeEditModal();
        return;
      }

      // Refresh joins (groups/categories names may have changed)
      const { data: refreshed, error: refreshError } = await supabase
        .from('needs')
        .select(
          `
          *,
          users:requester_user_id (id, full_name, email),
          organizations (display_name, primary_color),
          groups (id, name),
          need_categories (id, name),
          approved_by_user:approved_by (full_name),
          rejected_by_user:rejected_by (full_name),
          claimed_by_user:claimed_by (full_name, email),
          completed_by_user:completed_by (full_name, email),
          cancelled_by_user:cancelled_by (full_name)
        `
        )
        .eq('id', need.id)
        .single();

      if (refreshError) {
        // If refresh fails, still update core fields so UI looks right
        setNeed((prev) =>
          prev
            ? ({
                ...prev,
                ...(updatedRow as any),
              } as Need)
            : prev
        );
      } else {
        const normalized: Need = {
          ...(refreshed as any),
          users: normalizeJoin<Need['users']>((refreshed as any).users),
          organizations: normalizeJoin<Need['organizations']>((refreshed as any).organizations),
          groups: normalizeJoin<Need['groups']>((refreshed as any).groups),
          need_categories: normalizeJoin<Need['need_categories']>((refreshed as any).need_categories),
          approved_by_user: normalizeJoin<Need['approved_by_user']>((refreshed as any).approved_by_user),
          rejected_by_user: normalizeJoin<Need['rejected_by_user']>((refreshed as any).rejected_by_user),
          claimed_by_user: normalizeJoin<Need['claimed_by_user']>((refreshed as any).claimed_by_user),
          completed_by_user: normalizeJoin<Need['completed_by_user']>((refreshed as any).completed_by_user),
          cancelled_by_user: normalizeJoin<Need['cancelled_by_user']>((refreshed as any).cancelled_by_user),
        };
        setNeed(normalized);
      }

      toast.success('Need updated (pending approval).');
      closeEditModal();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save changes');
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
    <div className="flex gap-2 flex-wrap">
      {canAdminEdit && (
        <Button onClick={openEditModal} loading={processing}>
          <PencilSquareIcon className="h-4 w-4 mr-2" />
          Edit (Pending)
        </Button>
      )}

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
      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEditModal} />
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit Need (Pending Approval)</h2>
                <p className="text-sm text-gray-500">Admins can edit only while status is Pending Approval.</p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
              {/* Title / Description */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[110px]"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Group / Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={form.group_id}
                    onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
                    disabled={editLoadingOptions}
                  >
                    <option value="">No group</option>
                    {groupsOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  {editLoadingOptions && <p className="text-xs text-gray-400 mt-1">Loading…</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    disabled={editLoadingOptions}
                  >
                    <option value="">No category</option>
                    {categoriesOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {editLoadingOptions && <p className="text-xs text-gray-400 mt-1">Loading…</p>}
                </div>
              </div>

              {/* Work */}
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Work Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Location</label>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.work_location}
                      onChange={(e) => setForm((f) => ({ ...f, work_location: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.25"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.work_estimated_hours}
                      onChange={(e) => setForm((f) => ({ ...f, work_estimated_hours: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.work_start_date}
                      onChange={(e) => setForm((f) => ({ ...f, work_start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.work_end_date}
                      onChange={(e) => setForm((f) => ({ ...f, work_end_date: e.target.value }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">Skills Required (comma-separated)</label>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.work_skills_required}
                      onChange={(e) => setForm((f) => ({ ...f, work_skills_required: e.target.value }))}
                      placeholder="e.g., Painting, Carpentry, Babysitting"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">Tools Needed (comma-separated)</label>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.work_tools_needed}
                      onChange={(e) => setForm((f) => ({ ...f, work_tools_needed: e.target.value }))}
                      placeholder="e.g., Ladder, Drill, Truck"
                    />
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Financial Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.financial_amount}
                      onChange={(e) => setForm((f) => ({ ...f, financial_amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Currency</label>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.financial_currency}
                      onChange={(e) => setForm((f) => ({ ...f, financial_currency: e.target.value }))}
                      placeholder="USD"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.financial_due_date}
                      onChange={(e) => setForm((f) => ({ ...f, financial_due_date: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">Purpose</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[90px]"
                      value={form.financial_purpose}
                      onChange={(e) => setForm((f) => ({ ...f, financial_purpose: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Event */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Event Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Event Start</label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.event_date}
                      onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Event End</label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.event_end_date}
                      onChange={(e) => setForm((f) => ({ ...f, event_end_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Location</label>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.event_location}
                      onChange={(e) => setForm((f) => ({ ...f, event_location: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Max Attendees</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={form.event_max_attendees}
                      onChange={(e) => setForm((f) => ({ ...f, event_max_attendees: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input
                      id="rsvp_required"
                      type="checkbox"
                      checked={form.event_rsvp_required}
                      onChange={(e) => setForm((f) => ({ ...f, event_rsvp_required: e.target.checked }))}
                    />
                    <label htmlFor="rsvp_required" className="text-sm text-gray-700">
                      RSVP Required
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={closeEditModal} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} loading={processing}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

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

                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${urgencyPillClass}`}
                >
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