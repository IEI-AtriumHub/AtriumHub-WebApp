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

export type AdminEditNeedPendingParams = {
  need_uuid: string;

  p_title?: string | null;
  p_description?: string | null;

  p_group_id?: string | null;
  p_category_id?: string | null;

  p_work_location?: string | null;
  p_work_start_date?: string | null; // 'YYYY-MM-DD'
  p_work_end_date?: string | null;   // 'YYYY-MM-DD'
  p_work_estimated_hours?: number | null;
  p_work_skills_required?: string[] | null;
  p_work_tools_needed?: string[] | null;

  p_financial_amount?: number | null;
  p_financial_currency?: string | null;
  p_financial_purpose?: string | null;
  p_financial_due_date?: string | null; // 'YYYY-MM-DD'

  p_event_date?: string | null;     // ISO string timestamptz
  p_event_end_date?: string | null; // ISO string timestamptz
  p_event_location?: string | null;
  p_event_max_attendees?: number | null;
  p_event_rsvp_required?: boolean | null;
};

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

  // ✅ NEW: Admin edit allowed ONLY while PENDING_APPROVAL (enforced in DB)
  adminEditPending: (params: AdminEditNeedPendingParams) =>
    callRpcFunction('admin_edit_need_pending', params),
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