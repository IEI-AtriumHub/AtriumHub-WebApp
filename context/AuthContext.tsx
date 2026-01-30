// ============================================================================
// AUTH CONTEXT
// ============================================================================

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Organization } from '@/types';

const IMPERSONATION_KEY = 'atriumhub_impersonation';

interface ImpersonationData {
  originalUserId: string;
  originalUserEmail: string;
  impersonatedUserId: string;
  startedAt: string;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  organization: Organization | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Permission checks (use original user when impersonating - for security)
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isGroupLeader: boolean;
  isPending: boolean;
  isApproved: boolean;
  // Display checks (use impersonated user's role - for UI)
  displayIsAdmin: boolean;
  displayIsSuperAdmin: boolean;
  displayIsGroupLeader: boolean;
  // Impersonation
  isImpersonating: boolean;
  impersonatedUser: User | null;
  originalUser: User | null;
  startImpersonation: (targetUserId: string) => Promise<void>;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function logSupabaseError(context: string, error: any) {
  // Supabase/PostgREST errors are plain objects; sometimes console prints {} unless we serialize key fields.
  const safe = {
    context,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    status: error?.status,
    name: error?.name,
    // last resort:
    raw: error,
  };
  console.error('Supabase Error:', safe);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);

  const supabase = createClientComponentClient();

  const fetchUserData = async (supaUser: SupabaseUser) => {
    try {
      // Fetch user profile (self)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supaUser.id)
        .single();

      if (userError) {
        logSupabaseError('fetchUserData -> users self', userError);
        throw userError;
      }

      // Check for active impersonation
      // (guard: localStorage only exists in browser)
      const impersonationData =
        typeof window !== 'undefined' ? localStorage.getItem(IMPERSONATION_KEY) : null;

      if (impersonationData && userData) {
        const impersonation: ImpersonationData = JSON.parse(impersonationData);

        // Verify the original user matches current auth user
        if (impersonation.originalUserId === supaUser.id) {
          // Fetch impersonated user data
          const { data: impersonatedData, error: impersonatedError } = await supabase
            .from('users')
            .select('*')
            .eq('id', impersonation.impersonatedUserId)
            .single();

          if (impersonatedError) {
            // With RLS enabled, this will fail unless users RLS allows SUPER_ADMIN to read target user.
            logSupabaseError('fetchUserData -> users impersonated', impersonatedError);
          }

          if (!impersonatedError && impersonatedData) {
            setOriginalUser(userData);
            setImpersonatedUser(impersonatedData);
            setUser(impersonatedData); // Use impersonated user as current user
            setIsImpersonating(true);

            // Fetch impersonated user's organization
            if (impersonatedData.organization_id) {
              const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', impersonatedData.organization_id)
                .single();

              if (orgError) {
                logSupabaseError('fetchUserData -> organizations impersonated org', orgError);
              }

              setOrganization(orgData || null);
            }
            return;
          }
        }

        // Invalid impersonation data, clear it
        localStorage.removeItem(IMPERSONATION_KEY);
      }

      // Normal flow (no impersonation)
      setUser(userData);
      setOriginalUser(null);
      setImpersonatedUser(null);
      setIsImpersonating(false);

      // Fetch organization
      if (userData?.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', userData.organization_id)
          .single();

        if (orgError) {
          logSupabaseError('fetchUserData -> organizations self org', orgError);
          throw orgError;
        }

        setOrganization(orgData);
      } else {
        setOrganization(null);
      }
    } catch (error) {
      // This is the line you were seeing as "{}" before.
      // Now it should include message/code/status/details in the log above.
      console.error('Error fetching user data (caught):', error);
    }
  };

  const refreshUser = async () => {
    const {
      data: { user: supaUser },
    } = await supabase.auth.getUser();
    if (supaUser) {
      await fetchUserData(supaUser);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setUser(null);
        setOrganization(null);
        setIsImpersonating(false);
        setImpersonatedUser(null);
        setOriginalUser(null);
        localStorage.removeItem(IMPERSONATION_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear impersonation on sign out
    localStorage.removeItem(IMPERSONATION_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    setIsImpersonating(false);
    setImpersonatedUser(null);
    setOriginalUser(null);
    window.location.href = '/auth/login';
  };

  const startImpersonation = async (targetUserId: string) => {
    if (!user || (originalUser?.role !== 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN')) {
      throw new Error('Only Super Admins can impersonate users');
    }

    // Use original user if already impersonating, otherwise use current user
    const actualOriginalUser = originalUser || user;

    // Fetch target user
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (error || !targetUser) {
      if (error) logSupabaseError('startImpersonation -> users target', error);
      throw new Error('User not found');
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      throw new Error('Cannot impersonate other Super Admins');
    }

    if (targetUser.status !== 'APPROVED') {
      throw new Error('Cannot impersonate users who are not approved');
    }

    // Store impersonation data
    const impersonationData: ImpersonationData = {
      originalUserId: actualOriginalUser.id,
      originalUserEmail: actualOriginalUser.email,
      impersonatedUserId: targetUserId,
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonationData));

    // Update state
    setOriginalUser(actualOriginalUser);
    setImpersonatedUser(targetUser);
    setUser(targetUser);
    setIsImpersonating(true);

    // Fetch target user's organization
    if (targetUser.organization_id) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', targetUser.organization_id)
        .single();

      if (orgError) {
        logSupabaseError('startImpersonation -> organizations target org', orgError);
      }

      setOrganization(orgData || null);
    }

    // Redirect to home to see the impersonated user's view
    window.location.href = '/';
  };

  const stopImpersonation = () => {
    localStorage.removeItem(IMPERSONATION_KEY);

    // Restore original user
    if (originalUser) {
      setUser(originalUser);
      setIsImpersonating(false);
      setImpersonatedUser(null);
      setOriginalUser(null);

      // Refetch original user's organization
      if (originalUser.organization_id) {
        supabase
          .from('organizations')
          .select('*')
          .eq('id', originalUser.organization_id)
          .single()
          .then(({ data, error }) => {
            if (error) logSupabaseError('stopImpersonation -> organizations original org', error);
            setOrganization(data || null);
          });
      } else {
        setOrganization(null);
      }
    }

    // Redirect back to admin users page
    window.location.href = '/admin/users';
  };

  // Permission checks - use original user's role when impersonating (for security/access control)
  const actualUser = isImpersonating ? originalUser : user;
  const isSuperAdmin = actualUser?.role === 'SUPER_ADMIN';
  const isAdmin = actualUser?.role === 'ORG_ADMIN' || isSuperAdmin;
  const isGroupLeader = actualUser?.role === 'GROUP_LEADER';

  // Display checks - use displayed user's role (for UI rendering)
  const displayIsSuperAdmin = user?.role === 'SUPER_ADMIN';
  const displayIsAdmin = user?.role === 'ORG_ADMIN' || displayIsSuperAdmin;
  const displayIsGroupLeader = user?.role === 'GROUP_LEADER';

  // These are based on the displayed user (impersonated or real)
  const isPending = user?.status === 'PENDING';
  const isApproved = user?.status === 'APPROVED';

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        organization,
        loading,
        signOut,
        refreshUser,
        // Permission checks (for security)
        isAdmin,
        isSuperAdmin,
        isGroupLeader,
        isPending,
        isApproved,
        // Display checks (for UI)
        displayIsAdmin,
        displayIsSuperAdmin,
        displayIsGroupLeader,
        // Impersonation
        isImpersonating,
        impersonatedUser,
        originalUser,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// PROTECTED ROUTE HOOKS
// ============================================================================

export function useRequireAuth() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth/login';
    }
  }, [user, loading]);

  return { user, loading };
}

export function useRequireApproval() {
  const { user, loading, isApproved } = useAuth();

  useEffect(() => {
    if (!loading && user && !isApproved) {
      window.location.href = '/pending-approval';
    }
  }, [user, loading, isApproved]);

  return { user, loading };
}

export function useRequireAdmin() {
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      window.location.href = '/';
    }
  }, [user, loading, isAdmin]);

  return { user, loading };
}

export function useRequireRole(allowedRoles: string[]) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      window.location.href = '/';
    }
  }, [user, loading, allowedRoles]);

  return { user, loading };
}
