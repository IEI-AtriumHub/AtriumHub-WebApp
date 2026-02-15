'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  slug: string;
  display_name: string;
  logo_url: string | null;
  primary_color: string;
  allow_open_signup: boolean;
  is_active: boolean;
  created_at: string;
}

type OrgForm = {
  display_name: string;
  slug: string;
  primary_color: string;
  allow_open_signup: boolean;
  is_active: boolean;
};

export default function OrganizationsPage() {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const supabase = createClientComponentClient();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<OrgForm>({
    display_name: '',
    slug: '',
    primary_color: '#3b82f6',
    allow_open_signup: false,
    is_active: true,
  });

  // Determine if we're in production or local dev
  const getOrgUrl = (slug: string) => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      // Production (atriumhub.org + subdomains)
      if (hostname.includes('atriumhub.org')) {
        return `https://${slug}.atriumhub.org`;
      }

      // Local dev
      return `http://${slug}.localhost:3000`;
    }

    return `https://${slug}.atriumhub.org`;
  };

  const sanitizeSlug = (raw: string) =>
    raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copied to clipboard!');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const resetForm = () => {
    setFormData({
      display_name: '',
      slug: '',
      primary_color: '#3b82f6',
      allow_open_signup: false,
      is_active: true,
    });
  };

  const closeForm = () => {
    setEditingOrg(null);
    setShowCreateForm(false);
    resetForm();
  };

  // 🔥 Secure Admin API Caller (UPDATE + soft-delete)
  async function callAdminUpdateOrgApi(orgId: string, patch: Record<string, any>) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error('Missing session token. Please log out and back in.');
    }

    const res = await fetch('/api/admin/orgs/update-organization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ orgId, patch }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || 'Admin request failed');
    }

    return json.organization as Organization;
  }

  // 🔥 Secure Admin API Caller (CREATE) — we’ll add route next step if needed
  async function callAdminCreateOrgApi(payload: {
    display_name: string;
    slug: string;
    primary_color: string;
    allow_open_signup: boolean;
    is_active: boolean;
  }) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error('Missing session token. Please log out and back in.');
    }

    const res = await fetch('/api/admin/orgs/create-organization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || 'Admin create request failed');
    }

    return json.organization as Organization;
  }

  // Fetch organizations (reads are fine via RLS)
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      window.location.href = '/';
      return;
    }

    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrganizations((data as Organization[]) || []);
      } catch (error) {
        console.error('Error fetching organizations:', error);
        toast.error('Failed to load organizations');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchOrganizations();
    }
  }, [authLoading, user, isSuperAdmin, supabase]);

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setShowCreateForm(false);
    setFormData({
      display_name: org.display_name,
      slug: org.slug,
      primary_color: org.primary_color || '#3b82f6',
      allow_open_signup: org.allow_open_signup,
      is_active: org.is_active,
    });
  };

  const handleCreateStart = () => {
    setEditingOrg(null);
    resetForm();
    setShowCreateForm(true);
  };

  // ✅ CREATE via Admin API
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const slug = sanitizeSlug(formData.slug);

      const created = await callAdminCreateOrgApi({
        display_name: formData.display_name,
        slug,
        primary_color: formData.primary_color,
        allow_open_signup: formData.allow_open_signup,
        is_active: true,
      });

      setOrganizations((prev) => [created, ...prev]);
      toast.success('Organization created successfully!');
      closeForm();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  // ✅ UPDATE via Admin API
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setSaving(true);
    try {
      const slug = sanitizeSlug(formData.slug);

      const updated = await callAdminUpdateOrgApi(editingOrg.id, {
        display_name: formData.display_name,
        slug,
        primary_color: formData.primary_color,
        allow_open_signup: formData.allow_open_signup,
        is_active: formData.is_active,
      });

      setOrganizations((prev) => prev.map((o) => (o.id === editingOrg.id ? updated : o)));
      toast.success('Organization updated successfully!');
      closeForm();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  // ✅ SOFT DELETE (deactivate) via Admin API
  const handleDeactivate = async (org: Organization) => {
    if (!confirm(`Deactivate "${org.display_name}"?`)) return;

    try {
      const updated = await callAdminUpdateOrgApi(org.id, { is_active: false });
      setOrganizations((prev) => prev.map((o) => (o.id === org.id ? updated : o)));
      toast.success('Organization deactivated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to deactivate organization');
    }
  };

  const formTitle = useMemo(() => {
    if (editingOrg) return 'Edit Organization';
    if (showCreateForm) return 'Create New Organization';
    return '';
  }, [editingOrg, showCreateForm]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
              <h1 className="text-2xl font-bold text-gray-900">Manage Organizations</h1>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin/organization-urls">
                <Button variant="outline">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  View All URLs
                </Button>
              </Link>

              <Button onClick={handleCreateStart}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create / Edit Form */}
        {(showCreateForm || editingOrg) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{formTitle}</h2>
              <button
                type="button"
                onClick={closeForm}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={editingOrg ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Display Name *"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />

                <Input
                  label="Slug (URL-friendly name) *"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-full h-12 rounded border border-gray-300"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.allow_open_signup}
                      onChange={(e) => setFormData({ ...formData, allow_open_signup: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Allow open signup (anyone can join)</span>
                  </label>

                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" loading={saving}>
                  {editingOrg ? 'Update Organization' : 'Create Organization'}
                </Button>

                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>

              {showCreateForm && (
                <p className="text-xs text-gray-500">
                  If “Create” fails, it means the admin create endpoint isn’t deployed yet. We’ll add it next.
                </p>
              )}
            </form>
          </div>
        )}

        {/* Orgs List */}
        <div className="space-y-4">
          {organizations.map((org) => {
            const url = getOrgUrl(org.slug);
            const initial = (org.display_name?.[0] || org.slug?.[0] || 'O').toUpperCase();
            const badgeBase = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';

            return (
              <div key={org.id} className="bg-white rounded-lg shadow p-5 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-semibold shrink-0"
                    style={{ backgroundColor: org.primary_color || '#3b82f6' }}
                    title={org.display_name}
                  >
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      initial
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-gray-900 truncate">{org.display_name}</div>

                      <span
                        className={`${badgeBase} ${org.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>

                      {org.allow_open_signup && (
                        <span className={`${badgeBase} bg-blue-100 text-blue-800`}>Open Signup</span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 truncate">Slug: {org.slug}</div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-700 truncate">{url}</span>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(url)}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(org)}>
                    <PencilIcon className="h-4 w-4" />
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => handleDeactivate(org)}>
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}

          {organizations.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <div className="flex justify-center mb-3">
                <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
              </div>
              No organizations found.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
