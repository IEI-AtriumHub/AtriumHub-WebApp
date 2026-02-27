// ============================================================================
// SUPABASE CLIENT
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Next.js App Router compatible client
export const createSupabaseClient = () => {
  return createClientComponentClient();
};

// Server-side admin client (use with caution)
export const getAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// ============================================================================
// TENANT CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract organization slug from subdomain
 * Examples:
 *   church.app.com -> church
 *   localhost:3000 -> null (for development)
 */
export function getOrgSlugFromHost(host: string): string | null {
  // Development fallback
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return null;
  }

  // Extract subdomain
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

/**
 * Get organization from slug
 */
export async function getOrganizationBySlug(slug: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================================================
// RPC HELPERS
// ============================================================================

export async function callRpcFunction<T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<{ data: T | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc(functionName, params);
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================================================
// BUSINESS LOGIC RPC CALLS
// ============================================================================

export const needsApi = {
  submitForApproval: (needId: string) =>
    callRpcFunction('submit_need_for_approval', { need_uuid: needId }),

  approve: (needId: string, note?: string) =>
    callRpcFunction('approve_need', { need_uuid: needId, admin_note: note }),

  reject: (needId: string, reason: string) =>
    callRpcFunction('reject_need', { need_uuid: needId, rejection_reason: reason }),

  claim: (needId: string, note?: string) =>
    callRpcFunction('claim_need', { need_uuid: needId, claim_note: note }),

  unclaim: (needId: string, reason?: string) =>
    callRpcFunction('unclaim_need', { need_uuid: needId, unclaim_reason: reason }),

  complete: (needId: string, note?: string, actualHours?: number, actualAmount?: number) =>
    callRpcFunction('complete_need', {
      need_uuid: needId,
      completion_note: note,
      actual_hours: actualHours,
      actual_amount: actualAmount,
    }),

  cancel: (needId: string, reason: string) =>
    callRpcFunction('cancel_need', { need_uuid: needId, cancellation_reason: reason }),

  /**
   * Admin edit allowed ONLY when the need is PENDING_APPROVAL.
   * Enforced by the DB function `public.admin_edit_need_pending`.
   *
   * Notes:
   * - Only fields provided will be sent to RPC (undefined fields omitted).
   * - The function itself handles auth + role + org scoping + status gate.
   */
  adminEditPending: (
    needId: string,
    updates: {
      title?: string | null;
      description?: string | null;

      group_id?: string | null;
      category_id?: string | null;

      work_location?: string | null;
      work_start_date?: string | null; // YYYY-MM-DD
      work_end_date?: string | null; // YYYY-MM-DD
      work_estimated_hours?: number | null;
      work_skills_required?: string[] | null;
      work_tools_needed?: string[] | null;

      financial_amount?: number | null;
      financial_currency?: string | null;
      financial_purpose?: string | null;
      financial_due_date?: string | null; // YYYY-MM-DD

      event_date?: string | null; // ISO string
      event_end_date?: string | null; // ISO string
      event_location?: string | null;
      event_max_attendees?: number | null;
      event_rsvp_required?: boolean | null;
    }
  ) => {
    // Only include keys that are explicitly provided (undefined omitted).
    const params: Record<string, any> = { need_uuid: needId };

    if (updates.title !== undefined) params.p_title = updates.title;
    if (updates.description !== undefined) params.p_description = updates.description;

    if (updates.group_id !== undefined) params.p_group_id = updates.group_id;
    if (updates.category_id !== undefined) params.p_category_id = updates.category_id;

    if (updates.work_location !== undefined) params.p_work_location = updates.work_location;
    if (updates.work_start_date !== undefined) params.p_work_start_date = updates.work_start_date;
    if (updates.work_end_date !== undefined) params.p_work_end_date = updates.work_end_date;
    if (updates.work_estimated_hours !== undefined)
      params.p_work_estimated_hours = updates.work_estimated_hours;
    if (updates.work_skills_required !== undefined)
      params.p_work_skills_required = updates.work_skills_required;
    if (updates.work_tools_needed !== undefined)
      params.p_work_tools_needed = updates.work_tools_needed;

    if (updates.financial_amount !== undefined) params.p_financial_amount = updates.financial_amount;
    if (updates.financial_currency !== undefined)
      params.p_financial_currency = updates.financial_currency;
    if (updates.financial_purpose !== undefined)
      params.p_financial_purpose = updates.financial_purpose;
    if (updates.financial_due_date !== undefined)
      params.p_financial_due_date = updates.financial_due_date;

    if (updates.event_date !== undefined) params.p_event_date = updates.event_date;
    if (updates.event_end_date !== undefined) params.p_event_end_date = updates.event_end_date;
    if (updates.event_location !== undefined) params.p_event_location = updates.event_location;
    if (updates.event_max_attendees !== undefined)
      params.p_event_max_attendees = updates.event_max_attendees;
    if (updates.event_rsvp_required !== undefined)
      params.p_event_rsvp_required = updates.event_rsvp_required;

    return callRpcFunction('admin_edit_need_pending', params);
  },
};

export const usersApi = {
  approve: (userId: string) =>
    callRpcFunction('approve_user', { user_uuid: userId }),

  reject: (userId: string) =>
    callRpcFunction('reject_user', { user_uuid: userId }),
};

export const reportsApi = {
  getTopHelpers: (orgId: string, limit: number = 10) =>
    callRpcFunction('get_top_helpers', { org_uuid: orgId, limit_count: limit }),

  getFulfillmentMetrics: (orgId: string) =>
    callRpcFunction('get_fulfillment_metrics', { org_uuid: orgId }),

  getFinancialTotals: (orgId: string) =>
    callRpcFunction('get_financial_totals', { org_uuid: orgId }),

  exportCsv: (orgId: string) =>
    callRpcFunction<string>('export_needs_csv', { org_uuid: orgId }),
};

// ============================================================================
// FEATURE CHECKS
// ============================================================================

export async function checkOrgFeature(orgId: string, featureName: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('org_has_feature', {
    org_uuid: orgId,
    feature_name: featureName,
  });

  if (error) {
    console.error('Error checking feature:', error);
    return false;
  }

  return data === true;
}

export async function getMaxGroupsAllowed(orgId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_max_groups_allowed', {
    org_uuid: orgId,
  });

  if (error) {
    console.error('Error getting max groups:', error);
    return 5; // Default to STARTER
  }

  return data;
}