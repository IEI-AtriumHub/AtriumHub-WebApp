'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const ROOT_DOMAIN = 'atriumhub.org';

function getHost(): string {
  if (typeof window === 'undefined') return '';
  return window.location.host.toLowerCase();
}

function stripPort(host: string): string {
  return host.split(':')[0];
}

function isLocalhost(host: string): boolean {
  return host.includes('localhost') || host.startsWith('127.0.0.1');
}

function isVercelPreview(host: string): boolean {
  return host.endsWith('.vercel.app');
}

function isRootDomain(hostNoPort: string): boolean {
  return hostNoPort === ROOT_DOMAIN || hostNoPort === `www.${ROOT_DOMAIN}`;
}

function isSubdomainOfRoot(hostNoPort: string): boolean {
  return hostNoPort.endsWith(`.${ROOT_DOMAIN}`) && !isRootDomain(hostNoPort);
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const hostInfo = useMemo(() => {
    const host = getHost();
    const hostNoPort = stripPort(host);

    const allowSignup =
      isLocalhost(hostNoPort) ||
      isVercelPreview(hostNoPort) ||
      isSubdomainOfRoot(hostNoPort);

    return { host, hostNoPort, allowSignup };
  }, []);

  const err = searchParams?.get('error');
  const showOrgNotFoundBanner = err === 'organization_not_found';

  useEffect(() => {
    if (showOrgNotFoundBanner) {
      toast.error('Organization not found. Please check your URL (tenant subdomain).');
    }
  }, [showOrgNotFoundBanner]);

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

        {showOrgNotFoundBanner && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div className="font-semibold">Organization not found</div>
            <div className="mt-1">
              Use a valid tenant subdomain, like{' '}
              <span className="font-mono">faithworkscollective.atriumhub.org</span>.
            </div>
          </div>
        )}

        <p className="mt-2 text-center text-sm text-gray-600">
          {hostInfo.allowSignup ? (
            <>
              Or{' '}
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                create a new account
              </Link>
            </>
          ) : (
            <>Need an account? Use your organization’s invite link (tenant subdomain).</>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginPageInner />
    </Suspense>
  );
}
