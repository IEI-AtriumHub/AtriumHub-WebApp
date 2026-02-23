'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PageContainer from '@/components/layout/PageContainer';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { PlusIcon } from '@heroicons/react/24/outline';

type NeedPreview = {
  id: string;
  title: string;
  created_at: string;
  urgency: string | null;
  requester_user_id: string | null;
  users: { full_name: string } | null;
};

function normalizeOne<T>(value: any): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function urgencyBarClass(urgency: string | null | undefined) {
  switch ((urgency || '').toUpperCase()) {
    case 'CRITICAL':
      return 'border-red-500';
    case 'HIGH':
      return 'border-orange-500';
    case 'MEDIUM':
      return 'border-blue-500';
    case 'LOW':
      return 'border-gray-300';
    default:
      return 'border-gray-200';
  }
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [recentNeeds, setRecentNeeds] = useState<NeedPreview[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(true);

  useEffect(() => {
    if (!loading && user?.status === 'PENDING') {
      router.push('/pending-approval');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchNeeds = async () => {
      setLoadingNeeds(true);
      try {
        const { data, error } = await supabase
          .from('needs')
          .select(
            `
            id,
            title,
            created_at,
            urgency,
            requester_user_id,
            users:requester_user_id ( full_name )
          `
          )
          .eq('status', 'APPROVED_OPEN')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const normalized: NeedPreview[] = (data || []).map((n: any) => ({
          ...n,
          users: normalizeOne<{ full_name: string }>(n.users),
        }));

        setRecentNeeds(normalized);
      } catch (e) {
        console.error('Home Happening Now fetch failed:', e);
        setRecentNeeds([]);
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
    <PageContainer
      requireAuth
      title="Happening Now"
      actions={
        <div className="flex gap-2">
          <Link href="/needs">
            <Button variant="outline" size="sm">
              Browse
            </Button>
          </Link>
          <Link href="/needs/new">
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create
            </Button>
          </Link>
        </div>
      }
    >
      {loadingNeeds ? (
        <div className="text-gray-500 text-sm">Loading needs...</div>
      ) : recentNeeds.length === 0 ? (
        <div className="text-gray-500 text-sm">No open needs right now</div>
      ) : (
        <div className="space-y-3">
          {recentNeeds.map((n) => {
            const requester = n.users?.full_name?.trim() ? n.users.full_name : 'Unknown';
            return (
              <Link key={n.id} href={`/needs/${n.id}`}>
                <div
                  className={[
                    'bg-white rounded-lg shadow p-4 transition hover:shadow-md active:scale-[0.99]',
                    'border-l-4',
                    urgencyBarClass(n.urgency),
                  ].join(' ')}
                >
                  <div className="font-semibold text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-600 mt-1">Requested by {requester}</div>
                  <div className="text-xs text-gray-500 mt-1">Tap to view / claim</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}