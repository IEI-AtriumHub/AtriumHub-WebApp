'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const ROOT_DOMAIN = 'atriumhub.org';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // UI flags (computed client-side so it works for both root + subdomains)
  const [showOrgNotFound, setShowOrgNotFound] = useState(false);
  const [showSignupLink, setShowSignupLink] = useState(true);

  useEffect(() => {
    // Compute from the *actual browser URL* (not env vars, not static prerender)
    const host = window.location.hostname.toLowerCase();
    const isRoot = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
    const isTenant = host.endsWith(`.${ROOT_DOMAIN}`) && !isRoot;

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    // Only show the red banner on ROOT when we were redirected due to bad tenant
    setShowOrgNotFound(isRoot && error === 'organization_not_found');

    // Only show "create a new account" on tenant subdomains
    setShowSignupLink(isTenant);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: userData } = await supabase
        .from('users')
        .select('status')
        .eq('id', data.user.id)
        .single();

      toast.success('Welcome back!');

      if (userData?.status === 'PENDING') {
        router.push('/pending-approval');
        router.refresh();
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>

        {showOrgNotFound && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold">Organization not found</div>
            <div className="mt-1">
              Use a valid tenant subdomain, like{' '}
              <span className="font-mono">faithworkscollective.atriumhub.org</span>.
            </div>
          </div>
        )}

        <p className="mt-3 text-center text-sm text-gray-600">
          {showSignupLink ? (
            <>
              Or{' '}
              <Link
                href="/auth/signup"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                create a new account
              </Link>
            </>
          ) : (
            <>Need an account? Use your organization&apos;s invite link (tenant subdomain).</>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button type="submit" fullWidth loading={loading} disabled={loading}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
