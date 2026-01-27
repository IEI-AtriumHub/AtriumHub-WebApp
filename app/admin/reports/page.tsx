'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface ReportStats {
  totalNeeds: number;
  pendingNeeds: number;
  approvedNeeds: number;
  completedNeeds: number;
  totalUsers: number;
  pendingUsers: number;
}

export default function ReportsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [stats, setStats] = useState<ReportStats>({
    totalNeeds: 0,
    pendingNeeds: 0,
    approvedNeeds: 0,
    completedNeeds: 0,
    totalUsers: 0,
    pendingUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/';
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch needs counts
        const { data: needsData, error: needsError } = await supabase
          .from('needs')
          .select('status');

        if (needsError) throw needsError;

        const needsStats = {
          totalNeeds: needsData?.length || 0,
          pendingNeeds: needsData?.filter(n => n.status === 'PENDING').length || 0,
          approvedNeeds: needsData?.filter(n => n.status === 'APPROVED').length || 0,
          completedNeeds: needsData?.filter(n => n.status === 'COMPLETED').length || 0,
        };

        // Fetch users counts
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('status');

        if (usersError) throw usersError;

        const usersStats = {
          totalUsers: usersData?.length || 0,
          pendingUsers: usersData?.filter(u => u.status === 'PENDING').length || 0,
        };

        setStats({ ...needsStats, ...usersStats });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchStats();
    }
  }, [authLoading, user, isAdmin, supabase]);

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
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Needs Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs Overview</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total Needs</dt>
                <dd className="font-semibold">{stats.totalNeeds}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Pending Approval</dt>
                <dd className="font-semibold text-yellow-600">{stats.pendingNeeds}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Approved</dt>
                <dd className="font-semibold text-green-600">{stats.approvedNeeds}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Completed</dt>
                <dd className="font-semibold text-blue-600">{stats.completedNeeds}</dd>
              </div>
            </dl>
          </div>

          {/* Users Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Users Overview</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total Users</dt>
                <dd className="font-semibold">{stats.totalUsers}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Pending Approval</dt>
                <dd className="font-semibold text-yellow-600">{stats.pendingUsers}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Approved Users</dt>
                <dd className="font-semibold text-green-600">{stats.totalUsers - stats.pendingUsers}</dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/admin" className="block">
                <Button variant="outline" fullWidth>Manage Users</Button>
              </Link>
              <Link href="/needs" className="block">
                <Button variant="outline" fullWidth>View All Needs</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}