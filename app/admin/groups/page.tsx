'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import OrgSelector from '@/components/admin/OrgSelector';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  display_name: string;
  slug: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  organizations?: Organization;
}

export default function GroupsPage() {
  const { user, organization, loading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization_id: '',
    is_active: true,
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/';
      return;
    }

    const fetchData = async () => {
      try {
        // Super Admins can see all groups, regular admins only see their org's groups
        let groupsQuery = supabase
          .from('groups')
          .select(`
            *,
            organizations (id, display_name, slug)
          `)
          .order('created_at', { ascending: false });

        if (!isSuperAdmin && organization?.id) {
          groupsQuery = groupsQuery.eq('organization_id', organization.id);
        }

        const { data: groupsData, error: groupsError } = await groupsQuery;
        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // Super Admins need the list of all organizations for the dropdown
        if (isSuperAdmin) {
          const { data: orgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id, display_name, slug')
            .eq('is_active', true)
            .order('display_name');

          if (orgsError) throw orgsError;
          setOrganizations(orgsData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user, organization, isAdmin, isSuperAdmin, supabase]);

  // Filter groups based on selected organization
  const filteredGroups = groups.filter((g) => {
    if (selectedOrgId === 'ALL') return true;
    return g.organization_id === selectedOrgId;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      // Pre-select the org if one is selected in the filter
      organization_id: selectedOrgId !== 'ALL' ? selectedOrgId : (isSuperAdmin ? '' : (organization?.id || '')),
      is_active: true,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const orgId = isSuperAdmin ? formData.organization_id : organization?.id;
    if (!orgId) {
      toast.error('Please select an organization');
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            organization_id: orgId,
            is_active: true,
          },
        ])
        .select(`
          *,
          organizations (id, display_name, slug)
        `)
        .single();

      if (error) throw error;

      setGroups([data, ...groups]);
      setShowCreateForm(false);
      resetForm();
      toast.success('Group created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      organization_id: group.organization_id,
      is_active: group.is_active,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    const orgId = isSuperAdmin ? formData.organization_id : organization?.id;
    if (!orgId) {
      toast.error('Please select an organization');
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('groups')
        .update({
          name: formData.name,
          description: formData.description,
          organization_id: orgId,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingGroup.id)
        .select(`
          *,
          organizations (id, display_name, slug)
        `)
        .single();

      if (error) throw error;

      setGroups(groups.map(g => g.id === editingGroup.id ? data : g));
      setEditingGroup(null);
      resetForm();
      toast.success('Group updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGroups(groups.filter((group) => group.id !== id));
      toast.success('Group deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete group');
    }
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setShowCreateForm(false);
    resetForm();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSuperAdmin && !organization) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Manage Groups</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No organization found.</p>
            <p className="text-gray-400 mt-2">You need to be part of an organization to manage groups.</p>
          </div>
        </main>
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
                <h1 className="text-2xl font-bold text-gray-900">Manage Groups</h1>
                <p className="text-sm text-gray-500">
                  {filteredGroups.length} of {groups.length} groups
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Organization Selector - SuperAdmin only */}
              {isSuperAdmin && (
                <OrgSelector
                  selectedOrgId={selectedOrgId}
                  onOrgChange={setSelectedOrgId}
                />
              )}
              
              <Button onClick={() => { resetForm(); setShowCreateForm(true); }}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create/Edit Form */}
        {(showCreateForm || editingGroup) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingGroup ? 'Edit Group' : 'Create New Group'}
              </h2>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={editingGroup ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Group Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Youth Group, Senior Ministry"
                  required
                />
                
                {/* Organization dropdown - only for Super Admins */}
                {isSuperAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization *
                    </label>
                    <select
                      value={formData.organization_id}
                      onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select an organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editingGroup && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                      Active
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose of this group..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={saving}>
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Groups List */}
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No groups found.</p>
            {selectedOrgId !== 'ALL' ? (
              <p className="text-gray-400 mt-2">This organization has no groups yet.</p>
            ) : (
              <p className="text-gray-400 mt-2">Create your first group to organize your members.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-gray-500">{group.description}</p>
                      )}
                      {isSuperAdmin && selectedOrgId === 'ALL' && group.organizations && (
                        <p className="text-xs text-purple-600 mt-1">
                          Organization: {group.organizations.display_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {group.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(group.id)}>
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  Created: {new Date(group.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}