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

  // 🔥 Secure Admin API Caller
  async function callAdminOrgApi(orgId: string, patch: Record<string, any>) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error("Missing session token. Please log out and back in.");
    }

    const res = await fetch("/api/admin/orgs/update-organization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ orgId, patch }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Admin request failed");
    }

    return json.organization;
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

        setOrganizations(data || []);
      } catch (error) {
        console.error('Error fetching organizations:', error);
        toast.error("Failed to load organizations");
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

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      display_name: org.display_name,
      slug: org.slug,
      primary_color: org.primary_color,
      allow_open_signup: org.allow_open_signup,
      is_active: org.is_active,
    });
  };

  // ✅ UPDATE via Admin API
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setSaving(true);

    try {
      const slug = formData.slug
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const updatedOrg = await callAdminOrgApi(editingOrg.id, {
        display_name: formData.display_name,
        slug,
        primary_color: formData.primary_color,
        allow_open_signup: formData.allow_open_signup,
        is_active: formData.is_active,
      });

      setOrganizations(prev =>
        prev.map(org => org.id === editingOrg.id ? updatedOrg : org)
      );

      setEditingOrg(null);
      resetForm();

      toast.success('Organization updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  // ✅ SOFT DELETE via Admin API
  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this organization?')) return;

    try {
      const updatedOrg = await callAdminOrgApi(id, {
        is_active: false,
      });

      setOrganizations(prev =>
        prev.map(org => org.id === id ? updatedOrg : org)
      );

      toast.success('Organization deactivated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate organization');
    }
  };

  const cancelEdit = () => {
    setEditingOrg(null);
    resetForm();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Organizations</h1>

        <Link href="/admin">
          <Button variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {editingOrg && (
        <form onSubmit={handleUpdate} className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Edit Organization</h2>

          <Input
            label="Display Name"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            required
          />

          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />

          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Save
            </Button>

            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {organizations.map(org => (
          <div key={org.id} className="bg-white p-4 rounded shadow flex justify-between">
            <div>
              <div className="font-semibold">{org.display_name}</div>
              <div className="text-sm text-gray-500">{org.slug}</div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleEdit(org)}>
                <PencilIcon className="h-4 w-4" />
              </Button>

              <Button size="sm" variant="outline" onClick={() => handleDelete(org.id)}>
                <TrashIcon className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
