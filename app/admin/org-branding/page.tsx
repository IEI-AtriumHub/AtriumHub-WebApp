'use client';

import { useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Org = {
  id: string;
  display_name: string;
};

function isValidHexColor(v: string) {
  return /^#([0-9a-fA-F]{6})$/.test(v.trim());
}

export default function OrgBrandingToolPage() {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [organizationId, setOrganizationId] = useState<string>('');
  const [appName, setAppName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#1D4ED8'); // default blue
  const [secondaryColor, setSecondaryColor] = useState<string>('#111827'); // default gray-900

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrgs = async () => {
      setLoadingOrgs(true);
      setError(null);

      try {
        // Keep this select minimal so it doesn't fail if branding columns don't exist yet.
        const { data, error } = await supabase
          .from('organizations')
          .select('id, display_name')
          .order('display_name', { ascending: true });

        if (error) throw error;

        setOrgs((data || []) as Org[]);
      } catch (e: any) {
        setError(e?.message || 'Failed to load organizations');
      } finally {
        setLoadingOrgs(false);
      }
    };

    if (!authLoading && user && isSuperAdmin) {
      loadOrgs();
    }
  }, [authLoading, user, isSuperAdmin, supabase]);

  const saveBranding = async () => {
    setMessage(null);
    setError(null);

    if (!organizationId) {
      setError('Please select an organization.');
      return;
    }

    if (primaryColor && !isValidHexColor(primaryColor)) {
      setError('Primary color must be a 6-digit hex value like #1A2B3C');
      return;
    }

    if (secondaryColor && !isValidHexColor(secondaryColor)) {
      setError('Secondary color must be a 6-digit hex value like #1A2B3C');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/orgs/update-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          app_name: appName || null,
          logo_url: logoUrl || null,
          primary_color: primaryColor || null,
          secondary_color: secondaryColor || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.detail || json?.error || 'Failed to update branding');
      }

      setMessage('Saved! Branding updated for this organization.');
    } catch (e: any) {
      setError(e?.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <PageContainer title="Org Branding Tool" description="SuperAdmin only">
        <div className="py-10 text-gray-500">Loading...</div>
      </PageContainer>
    );
  }

  if (!isSuperAdmin) {
    return (
      <PageContainer title="Org Branding Tool" description="SuperAdmin only">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Forbidden</p>
          <p className="text-red-700 text-sm mt-1">This page is SuperAdmin only.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Org Branding Tool"
      description="Set logo + colors for an organization (SuperAdmin only)"
      actions={
        <Button onClick={saveBranding} disabled={saving || loadingOrgs}>
          {saving ? 'Saving...' : 'Save Branding'}
        </Button>
      }
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            disabled={loadingOrgs}
          >
            <option value="">{loadingOrgs ? 'Loading organizations...' : 'Select an organization'}</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.display_name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            This tool updates branding via the API (no direct DB edits).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Name (optional)</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g., Bethel"
            />
            <p className="text-xs text-gray-500 mt-2">
              We’ll use this later for the org-specific PWA manifest + install prompt.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (optional)</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Next step after this: true upload to Supabase Storage (so admins aren’t hosting images).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#1D4ED8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#111827"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg border flex items-center justify-center text-white font-semibold"
              style={{ background: primaryColor }}
              title="Primary color"
            >
              {appName?.trim()?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: secondaryColor }}>
                {appName?.trim() || 'Org App Name'}
              </div>
              <div className="text-xs text-gray-500">This is just a preview — saved values apply everywhere next step.</div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
