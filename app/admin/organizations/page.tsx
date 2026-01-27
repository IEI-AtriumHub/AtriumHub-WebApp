'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  LinkIcon,
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

export default function OrganizationsPage() {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    slug: '',
    primary_color: '#3b82f6',
    allow_open_signup: false,
    is_active: true,
  });
  const supabase = createClientComponentClient();

  // Determine if we're in production or local dev
  const getOrgUrl = (slug: string) => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Production
      if (hostname.includes('atriumhub.org')) {
        return `https://${slug}.atriumhub.org`;
      }
      // Local dev
      return `http://${slug}.localhost:3000`;
    }
    return `https://${slug}.atriumhub.org`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

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
        setOrganizations(data || []);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchOrganizations();
    }
  }, [authLoading, user, isSuperAdmin, supabase]);

  const resetForm = () => {
    setFormData({
      display_name: '',
      slug: '',
      primary_color: '#3b82f6',
      allow_open_signup: false,
      is_active: true,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const slug = formData.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data, error } = await supabase
        .from('organizations')
        .insert([
          {
            display_name: formData.display_name,
            slug: slug,
            primary_color: formData.primary_color,
            allow_open_signup: formData.allow_open_signup,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setOrganizations([data, ...organizations]);
      setShowCreateForm(false);
      resetForm();
      toast.success('Organization created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      display_name: org.display_name,
      slug: org.slug,
      primary_color: org.primary_color || '#3b82f6',
      allow_open_signup: org.allow_open_signup,
      is_active: org.is_active,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setSaving(true);

    try {
      const slug = formData.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data, error } = await supabase
        .from('organizations')
        .update({
          display_name: formData.display_name,
          slug: slug,
          primary_color: formData.primary_color,
          allow_open_signup: formData.allow_open_signup,
          is_active: formData.is_active,
        })
        .eq('id', editingOrg.id)
        .select()
        .single();

      if (error) throw error;

      setOrganizations(organizations.map(org => org.id === editingOrg.id ? data : org));
      setEditingOrg(null);
      resetForm();
      toast.success('Organization updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOrganizations(organizations.filter((org) => org.id !== id));
      toast.success('Organization deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete organization');
    }
  };

  const cancelEdit = () => {
    setEditingOrg(null);
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
              <Button onClick={() => { resetForm(); setShowCreateForm(true); }}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create/Edit Form */}
        {(showCreateForm || editingOrg) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingOrg ? 'Edit Organization' : 'Create New Organization'}
              </h2>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={editingOrg ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Display Name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="My Organization"
                  required
                />
                <Input
                  label="Slug (URL-friendly name)"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="my-org"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="h-10 w-full rounded border border-gray-300 cursor-pointer"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allow_open_signup"
                      checked={formData.allow_open_signup}
                      onChange={(e) => setFormData({ ...formData, allow_open_signup: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="allow_open_signup" className="ml-2 text-sm text-gray-700">
                      Allow open signup (anyone can join)
                    </label>
                  </div>
                  {editingOrg && (
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
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={saving}>
                  {editingOrg ? 'Update Organization' : 'Create Organization'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Organizations List */}
        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No organizations yet.</p>
            <p className="text-gray-400 mt-2">Create your first organization to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {organizations.map((org) => (
              <div key={org.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: org.primary_color || '#3b82f6' }}
                    >
                      {org.display_name?.charAt(0) || 'O'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{org.display_name}</h3>
                      <p className="text-sm text-gray-500">Slug: {org.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {org.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {org.allow_open_signup && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Open Signup
                      </span>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(org)}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(org.id)}>
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                
                {/* URL Section */}
                <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <code className="text-sm text-gray-600 flex-1 truncate">
                    {getOrgUrl(org.slug)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getOrgUrl(org.slug))}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>

                <div className="mt-3 text-sm text-gray-500">
                  Created: {new Date(org.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}