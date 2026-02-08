'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import OrgSelector from '@/components/admin/OrgSelector';
import toast from 'react-hot-toast';
import { RoleType, UserStatus } from '@/types';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Group {
  id: string;
  name: string;
  organization_id: string;
}

interface UserWithOrg {
  id: string;
  email: string;
  full_name: string;
  role: RoleType;
  status: UserStatus;
  created_at: string;
  organization_id: string;
  group_id: string | null;
  organizations?: {
    display_name: string;
    slug: string;
  } | null;
  groups?: {
    id: string;
    name: string;
  } | null;
}

const ROLE_LABELS: Record<RoleType, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  GROUP_LEADER: 'Group Leader',
  USER: 'User',
};

const ROLE_COLORS: Record<RoleType, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ORG_ADMIN: 'bg-blue-100 text-blue-800',
  GROUP_LEADER: 'bg-green-100 text-green-800',
  USER: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS: Record<UserStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DISABLED: 'bg-gray-100 text-gray-800',
};

export default function UsersPage() {
  const { user, loading: authLoading, isSuperAdmin, isAdmin, startImpersonation } = useAuth();
  const [users, setUsers] = useState<UserWithOrg[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithOrg | null>(null);
  const [editRole, setEditRole] = useState<RoleType>('USER');
  const [editStatus, setEditStatus] = useState<UserStatus>('PENDING');
  const [editGroupId, setEditGroupId] = useState<string>('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/';
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch users (without group join to avoid null issues)
        let usersQuery = supabase
          .from('users')
          .select(`
            id,
            email,
            full_name,
            role,
            status,
            created_at,
            organization_id,
            group_id,
            organizations (display_name, slug)
          `)
          .order('created_at', { ascending: false });

        // Non-super admins only see their org's users
        if (!isSuperAdmin && user?.organization_id) {
          usersQuery = usersQuery.eq('organization_id', user.organization_id);
        }

        const { data: usersData, error: usersError } = await usersQuery;
        if (usersError) throw usersError;

        // Fetch all groups (for filtering and editing)
        let groupsQuery = supabase
          .from('groups')
          .select('id, name, organization_id')
          .eq('is_active', true)
          .order('name');

        if (!isSuperAdmin && user?.organization_id) {
          groupsQuery = groupsQuery.eq('organization_id', user.organization_id);
        }

        const { data: groupsData, error: groupsError } = await groupsQuery;
        if (groupsError) throw groupsError;

        const safeGroups: Group[] = (groupsData || []) as Group[];
        setGroups(safeGroups);

        // Manually attach group info to users, then normalize organizations (array -> single object)
        const usersWithGroups = (usersData || []).map((u: any) => {
          const userGroup = safeGroups.find((g) => g.id === u.group_id);
          return {
            ...u,
            groups: userGroup ? { id: userGroup.id, name: userGroup.name } : null,
          };
        });

        const normalizedUsersWithGroups: UserWithOrg[] = (usersWithGroups || []).map((u: any) => ({
          ...u,
          organizations: Array.isArray(u.organizations) ? (u.organizations[0] ?? null) : (u.organizations ?? null),
        }));

        setUsers(normalizedUsersWithGroups);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user, isAdmin, isSuperAdmin, supabase]);

  // Get groups for the selected organization (for filtering)
  const filteredGroups = groups.filter((g) => selectedOrgId === 'ALL' || g.organization_id === selectedOrgId);

  // Get groups for the user being edited
  const getGroupsForUser = (orgId: string) => {
    return groups.filter((g) => g.organization_id === orgId);
  };

  // Filter users based on selected org and other filters
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const matchesOrg = selectedOrgId === 'ALL' || u.organization_id === selectedOrgId;
    const matchesGroup = groupFilter === 'ALL' || u.group_id === groupFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesOrg && matchesGroup;
  });

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setProcessingId(editingUser.id);

    try {
      const updates: any = {
        role: editRole,
        status: editStatus,
        group_id: editGroupId || null,
      };

      if (editStatus === 'APPROVED' && editingUser.status !== 'APPROVED') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase.from('users').update(updates).eq('id', editingUser.id);

      if (error) throw error;

      // Update local state
      const updatedGroup = groups.find((g) => g.id === editGroupId);
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                role: editRole,
                status: editStatus,
                group_id: editGroupId || null,
                groups: updatedGroup ? { id: updatedGroup.id, name: updatedGroup.name } : null,
              }
            : u
        )
      );

      setEditingUser(null);
      toast.success('User updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleImpersonate = async (targetUser: UserWithOrg) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can impersonate users');
      return;
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      toast.error('Cannot impersonate other Super Admins');
      return;
    }

    if (targetUser.status !== 'APPROVED') {
      toast.error('Cannot impersonate users who are not approved');
      return;
    }

    try {
      await startImpersonation(targetUser.id);
      toast.success(`Now viewing as ${targetUser.full_name || targetUser.email}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start impersonation');
    }
  };

  const openEditModal = (u: UserWithOrg) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditGroupId(u.group_id || '');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setGroupFilter('ALL');
  };

  const hasActiveFilters = searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL' || groupFilter !== 'ALL';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
                <p className="text-sm text-gray-500">
                  {filteredUsers.length} of {users.length} users
                </p>
              </div>
            </div>

            {/* Organization Selector - SuperAdmin only */}
            {isSuperAdmin && (
              <OrgSelector
                selectedOrgId={selectedOrgId}
                onOrgChange={(orgId) => {
                  setSelectedOrgId(orgId);
                  setGroupFilter('ALL'); // Reset group filter when org changes
                }}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <XMarkIcon className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as RoleType | 'ALL')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Roles</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ORG_ADMIN">Org Admin</option>
                  <option value="GROUP_LEADER">Group Leader</option>
                  <option value="USER">User</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'ALL')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Groups</option>
                  {filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <UserCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No users found.</p>
            {hasActiveFilters && <p className="text-gray-400 mt-2">Try adjusting your filters.</p>}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  {isSuperAdmin && selectedOrgId === 'ALL' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{u.full_name || 'No name'}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    {isSuperAdmin && selectedOrgId === 'ALL' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{u.organizations?.display_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{u.organizations?.slug || ''}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {u.groups?.name || <span className="text-gray-400 italic">Unassigned</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(u)} disabled={u.id === user?.id}>
                          <ShieldCheckIcon className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {isSuperAdmin && u.role !== 'SUPER_ADMIN' && u.status === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImpersonate(u)}
                            title="Login as this user"
                          >
                            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
                            Login As
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>{editingUser.full_name || 'No name'}</strong>
              </p>
              <p className="text-sm text-gray-500">{editingUser.email}</p>
              {isSuperAdmin && editingUser.organizations && (
                <p className="text-sm text-gray-500">Organization: {editingUser.organizations.display_name}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <select
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Group --</option>
                  {getGroupsForUser(editingUser.organization_id).map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as RoleType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  disabled={editingUser.role === 'SUPER_ADMIN' && !isSuperAdmin}
                >
                  {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                  <option value="ORG_ADMIN">Org Admin</option>
                  <option value="GROUP_LEADER">Group Leader</option>
                  <option value="USER">User</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={handleUpdateUser} loading={processingId === editingUser.id} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
