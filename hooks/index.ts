// ============================================================================
// CUSTOM HOOKS
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, needsApi, usersApi, reportsApi, checkOrgFeature } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Need,
  NeedWithRelations,
  Group,
  User,
  NeedCategory,
  NeedStatus,
  NeedType,
  TopHelper,
  FulfillmentMetrics,
  FinancialTotals,
  PlanFeatures,
  PLAN_FEATURES,
} from '@/types';

// ============================================================================
// NEEDS HOOKS
// ============================================================================

export function useNeeds(filters?: {
  status?: NeedStatus | NeedStatus[];
  groupId?: string;
  needType?: NeedType;
}) {
  const [needs, setNeeds] = useState<NeedWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuth();

  const fetchNeeds = useCallback(async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('needs')
        .select(`
          *,
          group:groups(*),
          category:need_categories(*),
          requester:users!needs_requester_user_id_fkey(*),
          claimer:users!needs_claimed_by_fkey(*)
        `)
        .eq('organization_id', organization.id);

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.groupId) {
        query = query.eq('group_id', filters.groupId);
      }

      if (filters?.needType) {
        query = query.eq('need_type', filters.needType);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNeeds(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organization, filters]);

  useEffect(() => {
    fetchNeeds();
  }, [fetchNeeds]);

  return { needs, loading, error, refetch: fetchNeeds };
}

export function useNeed(id: string) {
  const [need, setNeed] = useState<NeedWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNeed = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('needs_with_contact_info')
        .select(`
          *,
          group:groups(*),
          category:need_categories(*),
          requester:users!needs_requester_user_id_fkey(*),
          claimer:users!needs_claimed_by_fkey(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setNeed(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchNeed();
    }
  }, [id, fetchNeed]);

  return { need, loading, error, refetch: fetchNeed };
}

export function useMyNeeds() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState<NeedWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchMyNeeds = async () => {
      const { data } = await supabase
        .from('needs')
        .select(`
          *,
          group:groups(*),
          category:need_categories(*)
        `)
        .or(`requester_user_id.eq.${user.id},claimed_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      setNeeds(data || []);
      setLoading(false);
    };

    fetchMyNeeds();
  }, [user]);

  return { needs, loading };
}

// ============================================================================
// GROUPS HOOKS
// ============================================================================

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useAuth();

  const fetchGroups = useCallback(async () => {
    if (!organization) return;

    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('name');

    setGroups(data || []);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, refetch: fetchGroups };
}

export function useGroup(id: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroup = async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      setGroup(data);
      setLoading(false);
    };

    if (id) {
      fetchGroup();
    }
  }, [id]);

  return { group, loading };
}

// ============================================================================
// USERS HOOKS
// ============================================================================

export function useUsers(status?: string) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useAuth();

  const fetchUsers = useCallback(async () => {
    if (!organization) return;

    let query = supabase
      .from('users')
      .select('*')
      .eq('organization_id', organization.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data } = await query.order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }, [organization, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
}

export function usePendingUsers() {
  return useUsers('PENDING');
}

// ============================================================================
// CATEGORIES HOOKS
// ============================================================================

export function useCategories() {
  const [categories, setCategories] = useState<NeedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useAuth();

  const fetchCategories = useCallback(async () => {
    if (!organization) return;

    const { data } = await supabase
      .from('need_categories')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('name');

    setCategories(data || []);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}

// ============================================================================
// REPORTS HOOKS
// ============================================================================

export function useTopHelpers(limit: number = 10) {
  const [helpers, setHelpers] = useState<TopHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useAuth();

  useEffect(() => {
    if (!organization) return;

    const fetchHelpers = async () => {
      const { data } = await reportsApi.getTopHelpers(organization.id, limit);
      setHelpers(data || []);
      setLoading(false);
    };

    fetchHelpers();
  }, [organization, limit]);

  return { helpers, loading };
}

export function useFulfillmentMetrics() {
  const [metrics, setMetrics] = useState<FulfillmentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useAuth();

  useEffect(() => {
    if (!organization) return;

    const fetchMetrics = async () => {
      const { data } = await reportsApi.getFulfillmentMetrics(organization.id);
      setMetrics(data);
      setLoading(false);
    };

    fetchMetrics();
  }, [organization]);

  return { metrics, loading };
}

export function useFinancialTotals() {
  const [totals, setTotals] = useState<FinancialTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useAuth();

  useEffect(() => {
    if (!organization) return;

    const fetchTotals = async () => {
      const { data } = await reportsApi.getFinancialTotals(organization.id);
      setTotals(data);
      setLoading(false);
    };

    fetchTotals();
  }, [organization]);

  return { totals, loading };
}

// ============================================================================
// FEATURES HOOKS
// ============================================================================

export function useOrgFeatures(): PlanFeatures | null {
  const { organization } = useAuth();
  
  if (!organization) return null;
  
  const baseFeatures = PLAN_FEATURES[organization.plan_tier];
  
  // Apply overrides
  if (organization.features_override) {
    return {
      ...baseFeatures,
      ...organization.features_override,
    };
  }
  
  return baseFeatures;
}

export function useFeatureCheck(featureName: string): boolean {
  const [hasFeature, setHasFeature] = useState(false);
  const { organization } = useAuth();

  useEffect(() => {
    if (!organization) return;

    checkOrgFeature(organization.id, featureName).then(setHasFeature);
  }, [organization, featureName]);

  return hasFeature;
}

// ============================================================================
// NEED ACTIONS HOOKS
// ============================================================================

export function useNeedActions(needId: string, onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await needsApi.submitForApproval(needId);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to submit need');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  const approve = async (note?: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await needsApi.approve(needId, note);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to approve need');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  const reject = async (reason: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await needsApi.reject(needId, reason);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to reject need');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  const claim = async (note?: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await needsApi.claim(needId, note);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to claim need');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  const unclaim = async (reason?: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await needsApi.unclaim(needId, reason);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to unclaim need');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  const complete = async (note?: string, actualHours?: number, actualAmount?: number) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await needsApi.complete(needId, note, actualHours, actualAmount);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to complete need');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  const cancel = async (reason: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await needsApi.cancel(needId, reason);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to cancel need');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  return {
    loading,
    error,
    submit,
    approve,
    reject,
    claim,
    unclaim,
    complete,
    cancel,
  };
}

// ============================================================================
// USER ACTIONS HOOKS
// ============================================================================

export function useUserActions(userId: string, onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await usersApi.approve(userId);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to approve user');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  const reject = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await usersApi.reject(userId);
    setLoading(false);
    
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Failed to reject user');
      return false;
    }
    
    onSuccess?.();
    return true;
  };

  return { loading, error, approve, reject };
}
