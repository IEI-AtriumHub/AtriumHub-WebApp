'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UsersIcon,
  TagIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface PendingNeed {
  id: string;
  title: string;
  description: string;
  need_type: string;
  urgency: string;
  submitted_at: string;
  users: {
    full_name: string;
    email: string;
  } | null;
  organizations: {
    display_name: string;
  } | null;
  groups: {
    name: string;
  } | null;
}

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  organizations?: {
    display_name: string;
  } | null;
}

interface Stats {
  pendingNeeds: number;
  pendingUsers: number;
  activeNeeds: number;
  completedNeeds: number;
}

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin, isSuperAdmin, signOut } = useAuth();
  const [pendingNeeds, setPendingNeeds] = useState<PendingNeed[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [stats, setStats] = useState<Stats>({
    pendingNeeds: 0,
    pendingUsers: 0,
    activeNeeds: 0,
    completedNeeds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Allow SuperAdmin OR Admin into /admin
    if (!authLoading && !(isAdmin || isSuperAdmin)) {
      window.location.href = '/';
      return;
    }

    const fetchData = async () => {
      try {
        const orgId = user?.organization_id;

        // Needs pending approval
        let needsQuery = supabase
          .from('needs')
          .select(
            `
            id,
            title,
            description,
            need_type,
            urgency,
            submitted_at,
            users:requester_user_id (full_name, email),
            organizations (display_name),
            groups (name)
          `
          )
          .eq('status', 'PENDING_APPROVAL')
          .order('submitted_at', { ascending: true });

        if (!isSuperAdmin && orgId) {
          needsQuery = needsQuery.eq('organization_id', orgId);
        }

        const { data: needsData, error: needsError } = await needsQuery;
        if (needsError) throw needsError;

        const normalizedNeeds: PendingNeed[] = (needsData || []).map((n: any) => ({
          ...n,
          users: Array.isArray(n.users) ? (n.users[0] ?? null) : (n.users ?? null),
          organizations: Array.isArray(n.organizations) ? (n.organizations[0] ?? null) : (n.organizations ?? null),
          groups: Array.isArray(n.groups) ? (n.groups[0] ?? null) : (n.groups ?? null),
        }));

        setPendingNeeds(normalizedNeeds);

        // Users pending approval
        let usersQuery = supabase
          .from('users')
          .select(
            `
            id,
            email,
            full_name,
            created_at,
            organizations (display_name)
          `
          )
          .eq('status', 'PENDING')
          .order('created_at', { ascending: true });

        if (!isSuperAdmin && orgId) {
          usersQuery = usersQuery.eq('organization_id', orgId);
        }

        const { data: usersData, error: usersError } = await usersQuery;
        if (usersError) throw usersError;

        const normalizedUsers: PendingUser[] = (usersData || []).map((u: any) => ({
          ...u,
          organizations: Array.isArray(u.organizations) ? (u.organizations[0] ?? null) : (u.organizations ?? null),
        }));

        setPendingUsers(normalizedUsers);

        // Stats
        let pendingNeedsQuery = supabase
          .from('needs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING_APPROVAL');
        if (!isSuperAdmin && orgId) pendingNeedsQuery = pendingNeedsQuery.eq('organization_id', orgId);
        const { count: pendingNeedsCount } = await pendingNeedsQuery;

        let activeNeedsQuery = supabase
          .from('needs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'APPROVED_OPEN');
        if (!isSuperAdmin && orgId) activeNeedsQuery = activeNeedsQuery.eq('organization_id', orgId);
        const { count: activeNeedsCount } = await activeNeedsQuery;

        let completedNeedsQuery = supabase
          .from('needs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'COMPLETED');
        if (!isSuperAdmin && orgId) completedNeedsQuery = completedNeedsQuery.eq('organization_id', orgId);
        const { count: completedNeedsCount } = await completedNeedsQuery;

        let pendingUsersQuery = supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        if (!isSuperAdmin && orgId) pendingUsersQuery = pendingUsersQuery.eq('organization_id', orgId);
        const { count: pendingUsersCount } = await pendingUsersQuery;

        setStats({
          pendingNeeds: pendingNeedsCount || 0,
          pendingUsers: pendingUsersCount || 0,
          activeNeeds: activeNeedsCount || 0,
          completedNeeds: completedNeedsCount || 0,
        });
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) fetchData();
  }, [authLoading, user, isAdmin, isSuperAdmin, supabase]);

  const handleApproveNeed = async (needId: string) => {
    setProcessingId(needId);
    try {
      const { error } = await supabase
        .from('needs')
        .update({
          status: 'APPROVED_OPEN',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', needId);

      if (error) throw error;

      setPendingNeeds((prev) => prev.filter((n) => n.id !== needId));
      setStats((prev) => ({ ...prev, pendingNeeds: prev.pendingNeeds - 1, activeNeeds: prev.activeNeeds + 1 }));
      toast.success('Need approved successfully!');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve need');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectNeed = async (needId: string) => {
    const reason = prompt('Please provide a reason for rejection (optional):');

    setProcessingId(needId);
    try {
      const { error } = await supabase
        .from('needs')
        .update({
          status: 'REJECTED',
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id,
          rejection_reason: reason || null,
        })
        .eq('id', needId);

      if (error) throw error;

      setPendingNeeds((prev) => prev.filter((n) => n.id !== needId));
      setStats((prev) => ({ ...prev, pendingNeeds: prev.pendingNeeds - 1 }));
      toast.success('Need rejected');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reject need');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveUser = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: 'APPROVED',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setStats((prev) => ({ ...prev, pendingUsers: prev.pendingUsers - 1 }));
      toast.success('User approved successfully!');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve user');
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Safety: if for any reason user is absent after loading, bounce out.
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              AtriumHub
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user.full_name}</span>
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  Profile
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            {isSuperAdmin ? 'Super Admin - All Organizations' : 'Manage your organization'}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Pending Needs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingNeeds}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Pending Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-green-600 mb-3" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Needs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeNeeds}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedNeeds}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {isSuperAdmin && (
            <Link href="/admin/organizations" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Manage Organizations</h3>
              <p className="text-sm text-gray-500">Create and edit organizations</p>
            </Link>
          )}

          {isSuperAdmin && (
            <Link href="/admin/org-branding" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <Cog6ToothIcon className="h-8 w-8 text-fuchsia-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Org Branding</h3>
              <p className="text-sm text-gray-500">Name, logo, colors, PWA look</p>
            </Link>
          )}

          {isSuperAdmin && (
            <Link href="/admin/organization-categories" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <TagIcon className="h-8 w-8 text-amber-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Category Settings</h3>
              <p className="text-sm text-gray-500">Enable/disable categories per org</p>
            </Link>
          )}

          <Link href="/admin/users" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <UsersIcon className="h-8 w-8 text-indigo-600 mb-2" />
            <h3 className="font-semibold text-gray-900">Manage Users</h3>
            <p className="text-sm text-gray-500">
              {isSuperAdmin ? 'Edit roles & impersonate users' : 'Edit user roles and status'}
            </p>
          </Link>

          <Link href="/admin/groups" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <UserGroupIcon className="h-8 w-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-gray-900">Manage Groups</h3>
            <p className="text-sm text-gray-500">Create and edit groups</p>
          </Link>

          <Link href="/admin/reports" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <ChartBarIcon className="h-8 w-8 text-purple-600 mb-2" />
            <h3 className="font-semibold text-gray-900">Reports</h3>
            <p className="text-sm text-gray-500">View analytics and reports</p>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Needs Approval ({pendingNeeds.length})</h2>
          </div>

          {pendingNeeds.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No needs pending approval</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingNeeds.map((need) => (
                <div key={need.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{need.title}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{need.need_type}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            need.urgency === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : need.urgency === 'HIGH'
                              ? 'bg-orange-100 text-orange-700'
                              : need.urgency === 'MEDIUM'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {need.urgency}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        Requested by {need.users?.full_name || 'Unknown'} • {need.organizations?.display_name} •{' '}
                        {need.groups?.name || 'No group'}
                      </p>
                      <p className="text-gray-600 line-clamp-2">{need.description}</p>
                      <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(need.submitted_at).toLocaleString()}</p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleApproveNeed(need.id)}
                        loading={processingId === need.id}
                        disabled={processingId !== null}
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRejectNeed(need.id)}
                        loading={processingId === need.id}
                        disabled={processingId !== null}
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending User Approvals ({pendingUsers.length})</h2>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No users pending approval</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingUsers.map((pendingUser) => (
                <div key={pendingUser.id} className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pendingUser.full_name || 'No name'}</h3>
                    <p className="text-sm text-gray-500">{pendingUser.email}</p>
                    <p className="text-xs text-gray-400">
                      {pendingUser.organizations?.display_name || 'No organization'} • Registered:{' '}
                      {new Date(pendingUser.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleApproveUser(pendingUser.id)}
                    loading={processingId === pendingUser.id}
                    disabled={processingId !== null}
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}