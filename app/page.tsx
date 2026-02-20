'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user, loading, signOut, displayIsAdmin } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [recentNeeds, setRecentNeeds] = useState<any[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(true);

  useEffect(() => {
    if (!loading && user?.status === 'PENDING') {
      router.push('/pending-approval');
    }
  }, [user, loading, router]);

  // MOBILE DASHBOARD: fetch newest needs
  useEffect(() => {
    const fetchNeeds = async () => {
      try {
        const { data } = await supabase
          .from('needs')
          .select('id,title,created_at,status')
          .eq('status', 'OPEN')
          .order('created_at', { ascending: false })
          .limit(3);

        setRecentNeeds(data || []);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">

          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">AtriumHub</h1>

            <div className="flex gap-2">
              <Link href="/profile">
                <Button variant="outline" size="sm">Profile</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
            </div>
          </div>

          {/* NAV */}
          <nav className="flex flex-col sm:flex-row gap-2">
            <Link href="/needs"><Button variant="outline" className="w-full sm:w-auto">Browse Needs</Button></Link>
            <Link href="/needs/in-progress"><Button variant="outline" className="w-full sm:w-auto">In Progress</Button></Link>
            <Link href="/my-needs"><Button variant="outline" className="w-full sm:w-auto">My Needs</Button></Link>
            <Link href="/needs/new"><Button className="w-full sm:w-auto"><PlusIcon className="h-4 w-4 mr-2" />Create a Need</Button></Link>
            {displayIsAdmin && (
              <Link href="/admin"><Button variant="outline" className="w-full sm:w-auto">Admin</Button></Link>
            )}
          </nav>
        </div>
      </header>

      {/* MOBILE LIVE NEEDS */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        <div className="block md:hidden mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Happening Now
          </h2>

          {loadingNeeds ? (
            <div className="text-gray-500 text-sm">Loading needs...</div>
          ) : recentNeeds.length === 0 ? (
            <div className="text-gray-500 text-sm">No open needs right now</div>
          ) : (
            <div className="space-y-3">
              {recentNeeds.map(n => (
                <Link key={n.id} href={`/needs/${n.id}`}>
                  <div className="bg-white rounded-lg shadow p-4 active:scale-[0.99] transition">
                    <div className="font-medium text-gray-900">{n.title}</div>
                    <div className="text-xs text-gray-500">
                      Tap to view / claim
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
