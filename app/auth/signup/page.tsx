'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
}

/**
 * Inner component that is allowed to use useSearchParams().
 * This MUST be wrapped in <Suspense /> at the page level.
 */
function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(true);
  const [organization, setOrganization] = useState<{ id: string; display_name: string } | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Resolve organization from tenant subdomain or query param
  useEffect(() => {
    async function getOrganization() {
      setOrgLoading(true);

      let slug: string | null = null;
      const hostname = window.location.hostname;

      // Production subdomain (e.g. org.atriumhub.org)
      if (
        hostname.endsWith('atriumhub.org') &&
        hostname !== 'atriumhub.org' &&
        hostname !== 'www.atriumhub.org'
      ) {
        slug = hostname.split('.')[0];
      }
      // Local dev subdomain (e.g. org.localhost)
      else if (hostname.endsWith('.localhost')) {
        slug = hostname.split('.')[0];
      }
      // Fallback: query param ?org=slug
      else {
        slug = searchParams.get('org');
      }

      if (!slug) {
        setOrgError(
          'Sign up is only available through your organization’s private access link. ' +
          'Please contact your administrator for access.'
        );
        setOrgLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('id, display_name, is_active, allow_open_signup')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setOrgError(
          'Sign up is only available through your organization’s private access link. ' +
          'Please contact your administrator for access.'
        );
        setOrgLoading(false);
        return;
      }

      if (!data.is_active) {
        setOrgError(
          'This organization is currently inactive. Please contact your administrator.'
        );
        setOrgLoading(false);
        return;
      }

      if (!data.allow_open_signup) {
        setOrgError(
          'This organization does not allow open sign-ups. Please contact your administrator.'
        );
        setOrgLoading(false);
        return;
      }

      setOrganization({ id: data.id, display_name: data.display_name });

      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name')
        .eq('organization_id', data.id)
        .eq('is_active', true)
        .order('name');

      setGroups(groupsData || []);
      setOrgLoading(false);
    }

    getOrganization();
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) {
      toast.error('No valid organization found');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (groups.length > 0 && !selectedGroupId) {
      toast.error('Please select a group');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization_id: organization.id,
            group_id: selectedGroupId || null,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      await supabase.from('users').insert({
        id: authData.user.id,
        organization_id: organization.id,
        email,
        full_name: fullName,
        group_id: selectedGroupId || null,
        status: 'PENDING',
        role: 'USER',
      });

      toast.success('Account created! Awaiting administrator approval.');
      router.push('/auth/pending-approval');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-6 rounded-lg shadow text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Unable to Sign Up
          </h2>
          <p className="text-gray-700">{orgError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Joining <span className="font-semibold">{organization?.display_name}</span>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSignup} className="space-y-6">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {groups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Your Group
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">-- Select a Group --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth loading={loading} disabled={loading}>
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Page-level component — MUST wrap content in Suspense
 */
export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <SignupInner />
    </Suspense>
  );
}
