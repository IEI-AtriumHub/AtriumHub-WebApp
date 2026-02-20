'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PageContainer from '@/components/layout/PageContainer';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/outline';

type RecentNeed = {
  id: string;
  title: string;
  created_at: string;
  urgency: string | null;
  users: { full_name: string } | null;
};

function normalizeOne<T>(value: any): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const urgencyBarColors: Record<string, string> = {
  LOW: 'bg-gray-300',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

export default function HomePage() {
  const { user, loading, signOut, displayIsAdmin } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [recentNeeds, setRecentNeeds] = useState<RecentNeed[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(true);

  useEffect(() => {
    if (!loading && user?.status === 'PENDING') {
      router.push('/pending-approval');
    }
  }, [user, loading, router]);

  // Fetch newest OPEN needs (APPROVED_OPEN)
  useEffect(() => {
    const fetchNeeds = async () => {
      try {
        const { data } = await supabase
          .from('needs')
          .select('id,title,created_at,urgency,users:requester_user_id(full_name)')
          .eq('status', 'APPROVED_OPEN')
          .order('created_at', { ascending: false })
          .limit(5);

        const normalized: RecentNeed[] = (data || []).map((n: any) => ({
          ...n,
          users: normalizeOne<{ full_name: string }>(n.users),
        }));

        setRecentNeeds(normalized);
      } finally {
        setLoadingNeeds(false);
      }
    };

    if (user) fetchNeeds();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">AtriumHub</h1>

            <div className="flex gap-2">
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  Profile
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>

          {/* NAV */}
          <nav className="flex flex-col sm:flex-row gap-2">
            <Link href="/needs">
              <Button variant="outline" className="w-full sm:w-auto">
                Browse Needs
              </Button>
            </Link>
            <Link href="/needs/in-progress">
              <Button variant="outline" className="w-full sm:w-auto">
                In Progress
              </Button>
            </Link>
            <Link href="/my-needs">
              <Button variant="outline" className="w-full sm:w-auto">
                My Needs
              </Button>
            </Link>
            <Link href="/needs/new">
              <Button className="w-full sm:w-auto">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create a Need
              </Button>
            </Link>
            {displayIsAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="w-full sm:w-auto">
                  Admin
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Happening Now (NOW shows on desktop too) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Happening Now</h2>
            <Link href="/needs">
              <Button variant="outline" size="sm">
                Browse
              </Button>
            </Link>
          </div>

          {loadingNeeds ? (
            <div className="text-gray-500 text-sm">Loading needs...</div>
          ) : recentNeeds.length === 0 ? (
            <div className="text-gray-500 text-sm">No open needs right now</div>
          ) : (
            <div className="space-y-3">
              {recentNeeds.map((n) => {
                const bar =
                  urgencyBarColors[String(n.urgency || '').toUpperCase()] || 'bg-gray-300';
                const requester = n.users?.full_name || 'Unknown';

                return (
                  <Link key={n.id} href={`/needs/${n.id}`}>
                    <div className="bg-white rounded-lg shadow p-4 active:scale-[0.99] transition flex gap-3">
                      <div className={`w-1 rounded-full ${bar}`} />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{n.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Requested by <span className="font-medium">{requester}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Tap to view / claim</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to AtriumHub</h2>
          <p className="text-gray-600">Your needs-sharing platform. What would you like to do?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/needs" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Browse Needs</h3>
              <p className="text-sm text-gray-600">View and claim available needs</p>
            </div>
          </Link>

          <Link href="/needs/in-progress" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">In Progress</h3>
              <p className="text-sm text-gray-600">See needs currently being worked on</p>
            </div>
          </Link>

          <Link href="/my-needs" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <PlusIcon className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">My Needs</h3>
              <p className="text-sm text-gray-600">Manage your submitted needs</p>
            </div>
          </Link>

          {displayIsAdmin ? (
            <Link href="/admin" className="block">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <UserGroupIcon className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Admin Panel</h3>
                <p className="text-sm text-gray-600">Manage users and approvals</p>
              </div>
            </Link>
          ) : (
            <Link href="/profile" className="block">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <Cog6ToothIcon className="h-8 w-8 text-gray-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
                <p className="text-sm text-gray-600">Update your profile</p>
              </div>
            </Link>
          )}
        </div>

        {displayIsAdmin && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/profile" className="block">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <Cog6ToothIcon className="h-8 w-8 text-gray-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
                <p className="text-sm text-gray-600">Update your profile</p>
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
