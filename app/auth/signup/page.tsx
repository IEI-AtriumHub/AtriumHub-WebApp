'use client';

import { useState, useEffect } from 'react';
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

export default function SignupPage() {
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

  // Get organization from subdomain (production) or subdomain.localhost (local dev)
  useEffect(() => {
    async function getOrganization() {
      setOrgLoading(true);
      
      let slug: string | null = null;
      const hostname = window.location.hostname;
      
      // Production: extract from subdomain (e.g., "acmechurch" from "acmechurch.atriumhub.org")
      if (hostname.includes('atriumhub.org') && hostname !== 'atriumhub.org' && hostname !== 'www.atriumhub.org') {
        slug = hostname.split('.')[0];
      } 
      // Local dev: extract from subdomain (e.g., "innovation-institute" from "innovation-institute.localhost")
      else if (hostname.includes('.localhost')) {
        slug = hostname.split('.')[0];
      }
      // Fallback: use query parameter (e.g., ?org=acmechurch)
      else {
        slug = searchParams.get('org');
      }

      if (!slug) {
        setOrgError('No organization specified. Please use a valid organization URL.');
        setOrgLoading(false);
        return;
      }

      // Look up organization by slug
      const { data, error } = await supabase
        .from('organizations')
        .select('id, display_name, is_active, allow_open_signup')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setOrgError('Organization not found. Please check your URL.');
        setOrgLoading(false);
        return;
      }

      if (!data.is_active) {
        setOrgError('This organization is not currently active.');
        setOrgLoading(false);
        return;
      }

      if (!data.allow_open_signup) {
        setOrgError('This organization does not allow open signups. Please contact your administrator.');
        setOrgLoading(false);
        return;
      }

      setOrganization({ id: data.id, display_name: data.display_name });
      
      // Fetch groups for this organization
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('organization_id', data.id)
        .eq('is_active', true)
        .order('name');

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
      } else {
        setGroups(groupsData || []);
      }

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
      // Step 1: Create auth user
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
      
      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: Create user record in public.users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          organization_id: organization.id,
          email: email,
          full_name: fullName,
          group_id: selectedGroupId || null,
          status: 'PENDING',
          role: 'USER',
        });

      if (userError) {
        console.error('Error creating user record:', userError);
        // Don't throw - auth user is created, admin can fix the record manually if needed
      }
      
      toast.success('Account created! Awaiting admin approval.');
      router.push('/auth/pending-approval');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <p className="text-gray-600">Loading organization...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (orgError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Unable to Sign Up</h2>
            <p className="text-gray-600">{orgError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Joining <span className="font-semibold">{organization?.display_name}</span>
        </p>
        <p className="mt-1 text-center text-sm text-gray-600">
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
              type="text"
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
              autoComplete="email"
            />
            
            {/* Group Selection Dropdown */}
            {groups.length > 0 && (
              <div>
                <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Your Group
                </label>
                <select
                  id="group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Select a Group --</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {groups.length === 0 && !orgLoading && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                No groups are currently available. You will be assigned to a group by an administrator.
              </div>
            )}

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}