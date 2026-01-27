'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  display_name: string;
  slug: string;
  primary_color: string;
}

interface Category {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
}

export default function CreateNeedPage() {
  const { user, organization: userOrganization, loading: authLoading, isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    need_type: 'WORK',
    urgency: 'MEDIUM',
    category_id: '',
    group_id: '',
    // Work-specific fields
    work_location: '',
    work_start_date: '',
    work_end_date: '',
    work_estimated_hours: '',
    work_skills_required: '',
    work_tools_needed: '',
    // Financial-specific fields
    financial_amount: '',
    financial_currency: 'USD',
    financial_purpose: '',
    financial_due_date: '',
  });

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Fetch all organizations for Super Admin
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!isSuperAdmin) {
        // Regular users just use their own organization
        if (userOrganization) {
          setSelectedOrgId(userOrganization.id);
          setSelectedOrg(userOrganization as Organization);
        }
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, display_name, slug, primary_color')
          .eq('is_active', true)
          .order('display_name');

        if (error) throw error;
        setOrganizations(data || []);

        // Default to user's organization if they have one
        if (userOrganization) {
          setSelectedOrgId(userOrganization.id);
          setSelectedOrg(userOrganization as Organization);
        } else if (data && data.length > 0) {
          setSelectedOrgId(data[0].id);
          setSelectedOrg(data[0]);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchOrganizations();
    }
  }, [authLoading, user, userOrganization, isSuperAdmin, supabase]);

  // Fetch groups and categories when selected organization changes
  useEffect(() => {
    const fetchOrgData = async () => {
      if (!selectedOrgId) {
        setGroups([]);
        setCategories([]);
        return;
      }

      try {
        // Fetch groups for selected organization
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('id, name')
          .eq('organization_id', selectedOrgId)
          .eq('is_active', true)
          .order('name');

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // ✅ Fetch categories:
        // - include global categories (organization_id is null)
        // - include org-specific categories (organization_id = selectedOrgId)
        // - only active and not hidden (treat null hidden as not hidden)
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('need_categories')
          .select('id, name')
          .eq('is_active', true)
          .or(`organization_id.is.null,organization_id.eq.${selectedOrgId}`)
          .or('is_hidden.is.null,is_hidden.eq.false')
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        // Reset selections when org changes
        setFormData((prev) => ({ ...prev, group_id: '', category_id: '' }));
      } catch (error) {
        console.error('Error fetching org data:', error);
      }
    };

    fetchOrgData();
  }, [selectedOrgId, supabase]);

  // Update selectedOrg when selectedOrgId changes
  useEffect(() => {
    if (isSuperAdmin && selectedOrgId) {
      const org = organizations.find((o) => o.id === selectedOrgId);
      setSelectedOrg(org || null);
    }
  }, [selectedOrgId, organizations, isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }

    if (!formData.group_id) {
      toast.error('Please select a group');
      return;
    }

    setSubmitting(true);

    try {
      const needData: any = {
        title: formData.title,
        description: formData.description,
        need_type: formData.need_type,
        urgency: formData.urgency,
        status: 'PENDING_APPROVAL',
        organization_id: selectedOrgId,
        group_id: formData.group_id,
        requester_user_id: user.id,
        submitted_at: new Date().toISOString(),
      };

      // Add category if selected
      if (formData.category_id) {
        needData.category_id = formData.category_id;
      }

      // Add type-specific fields
      if (formData.need_type === 'WORK') {
        if (formData.work_location) needData.work_location = formData.work_location;
        if (formData.work_start_date) needData.work_start_date = formData.work_start_date;
        if (formData.work_end_date) needData.work_end_date = formData.work_end_date;
        if (formData.work_estimated_hours)
          needData.work_estimated_hours = parseFloat(formData.work_estimated_hours);
        if (formData.work_skills_required)
          needData.work_skills_required = formData.work_skills_required
            .split(',')
            .map((s) => s.trim());
        if (formData.work_tools_needed)
          needData.work_tools_needed = formData.work_tools_needed
            .split(',')
            .map((s) => s.trim());
      } else if (formData.need_type === 'FINANCIAL') {
        if (formData.financial_amount) needData.financial_amount = parseFloat(formData.financial_amount);
        if (formData.financial_currency) needData.financial_currency = formData.financial_currency;
        if (formData.financial_purpose) needData.financial_purpose = formData.financial_purpose;
        if (formData.financial_due_date) needData.financial_due_date = formData.financial_due_date;
      }

      const { error } = await supabase.from('needs').insert([needData]);

      if (error) throw error;

      toast.success('Need submitted successfully! It will be reviewed by an admin.');
      router.push('/my-needs');
    } catch (error: any) {
      console.error('Error creating need:', error);
      toast.error(error.message || 'Failed to create need');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSuperAdmin && !userOrganization) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link href="/needs">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Create a Need</h1>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">You need to be part of an organization to create a need.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/needs">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Create a Need</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Organization Banner */}
        <div
          className="rounded-lg p-4 mb-6 flex items-center gap-4"
          style={{ backgroundColor: selectedOrg?.primary_color ? `${selectedOrg.primary_color}15` : '#f3f4f6' }}
        >
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: selectedOrg?.primary_color || '#3b82f6' }}
          >
            {selectedOrg?.display_name?.charAt(0) || <BuildingOfficeIcon className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            {isSuperAdmin ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Creating need for organization:
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.display_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">Creating need for:</p>
                <p className="text-lg font-semibold text-gray-900">{selectedOrg?.display_name}</p>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <Input
                label="Title *"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief title describing your need"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about what you need help with..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type of Need *</label>
                  <select
                    value={formData.need_type}
                    onChange={(e) => setFormData({ ...formData, need_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="WORK">Work / Service</option>
                    <option value="FINANCIAL">Financial</option>
                    <option value="EVENT">Events & Invitations</option>
                    <option value="REQUEST">Requests & Opportunities</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency *</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="LOW">Low - No rush</option>
                    <option value="MEDIUM">Medium - Within a few weeks</option>
                    <option value="HIGH">High - Within a week</option>
                    <option value="CRITICAL">Critical - Immediate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group *</label>
                  <select
                    value={formData.group_id}
                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!selectedOrgId}
                  >
                    <option value="">
                      {!selectedOrgId
                        ? 'Select an organization first'
                        : groups.length === 0
                        ? 'No groups available - create one first'
                        : 'Select a group'}
                    </option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  {selectedOrgId && groups.length === 0 && (
                    <p className="mt-1 text-sm text-amber-600">
                      <Link href="/admin/groups" className="underline hover:text-amber-700">
                        Create a group
                      </Link>{' '}
                      for this organization first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={!selectedOrgId}
                  >
                    <option value="">
                      {!selectedOrgId
                        ? 'Select an organization first'
                        : categories.length === 0
                        ? 'No categories available (optional)'
                        : 'Select a category (optional)'}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Work-specific fields */}
          {formData.need_type === 'WORK' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Details</h2>
              <div className="space-y-4">
                <Input
                  label="Location"
                  type="text"
                  value={formData.work_location}
                  onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                  placeholder="Where the work needs to be done"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.work_start_date}
                    onChange={(e) => setFormData({ ...formData, work_start_date: e.target.value })}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={formData.work_end_date}
                    onChange={(e) => setFormData({ ...formData, work_end_date: e.target.value })}
                  />
                </div>

                <Input
                  label="Estimated Hours"
                  type="number"
                  value={formData.work_estimated_hours}
                  onChange={(e) => setFormData({ ...formData, work_estimated_hours: e.target.value })}
                  placeholder="Approximate hours needed"
                />

                <Input
                  label="Skills Required"
                  type="text"
                  value={formData.work_skills_required}
                  onChange={(e) => setFormData({ ...formData, work_skills_required: e.target.value })}
                  placeholder="e.g., Carpentry, Painting, Cooking (comma-separated)"
                />

                <Input
                  label="Tools/Materials Needed"
                  type="text"
                  value={formData.work_tools_needed}
                  onChange={(e) => setFormData({ ...formData, work_tools_needed: e.target.value })}
                  placeholder="e.g., Hammer, Paint brushes (comma-separated)"
                />
              </div>
            </div>
          )}

          {/* Financial-specific fields */}
          {formData.need_type === 'FINANCIAL' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Amount Needed"
                    type="number"
                    value={formData.financial_amount}
                    onChange={(e) => setFormData({ ...formData, financial_amount: e.target.value })}
                    placeholder="0.00"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={formData.financial_currency}
                      onChange={(e) => setFormData({ ...formData, financial_currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / What it's for</label>
                  <textarea
                    value={formData.financial_purpose}
                    onChange={(e) => setFormData({ ...formData, financial_purpose: e.target.value })}
                    placeholder="Explain what the funds will be used for..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <Input
                  label="Due Date"
                  type="date"
                  value={formData.financial_due_date}
                  onChange={(e) => setFormData({ ...formData, financial_due_date: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link href="/needs">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={submitting} disabled={!selectedOrgId || !formData.group_id}>
              Submit Need
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
