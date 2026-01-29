'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

type KeyValue = { key: string; value: number };
type Weekly = { week_start: string; created_count: number };
type CycleTimes = {
  avg_submit_to_approve_hours: number | null;
  avg_approve_to_claim_hours: number | null;
  avg_claim_to_complete_hours: number | null;
};

type TopGroup = { id: string; name: string; need_count: number };

type ReportsPayload = {
  scope: 'ORG' | 'GROUPS';
  organization_id: string;
  status_counts: KeyValue[];
  type_counts: KeyValue[];
  urgency_counts: KeyValue[];
  created_weekly: Weekly[];
  cycle_times: CycleTimes;
  top_groups: TopGroup[];
};

function hoursToNice(hours: number | null | undefined) {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '—';
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

function getCount(map: Record<string, number>, key: string) {
  return map[key] ?? 0;
}

export default function ReportsPage() {
  const { user, loading: authLoading, isSuperAdmin, organization } = useAuth();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<ReportsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optional org selector for SUPER_ADMIN (safe default: current org)
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  useEffect(() => {
    if (!selectedOrgId && organization?.id) {
      setSelectedOrgId(organization.id);
    }
  }, [organization?.id, selectedOrgId]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = '/';
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        // SUPER_ADMIN may pass selected org id; others should pass null (function will use their org)
        const orgParam = isSuperAdmin ? (selectedOrgId || null) : null;

        const { data, error } = await supabase.rpc('get_admin_reports_summary', {
          p_organization_id: orgParam,
        });

        if (error) throw error;

        setPayload(data as ReportsPayload);
      } catch (e: any) {
        console.error('Error loading reports:', e);

        const msg = e?.message || 'Failed to load reports';

        // If the function says "Not authorized", send them home.
        if (typeof msg === 'string' && msg.toLowerCase().includes('not authorized')) {
          window.location.href = '/';
          return;
        }

        setError(msg);
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };

    if (isSuperAdmin && !selectedOrgId) return;

    fetchReport();
  }, [authLoading, user, supabase, isSuperAdmin, selectedOrgId]);

  const totals = useMemo(() => {
    if (!payload) return null;

    const statusMap = Object.fromEntries(payload.status_counts.map((x) => [x.key, x.value]));
    const typeMap = Object.fromEntries(payload.type_counts.map((x) => [x.key, x.value]));
    const urgencyMap = Object.fromEntries(payload.urgency_counts.map((x) => [x.key, x.value]));

    const totalNeeds = payload.status_counts.reduce((sum, x) => sum + (x.value || 0), 0);

    return { totalNeeds, statusMap, typeMap, urgencyMap };
  }, [payload]);

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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <p className="text-sm text-gray-500">
                  {payload?.scope === 'GROUPS' ? 'Scoped to your groups' : 'Scoped to your organization'}
                </p>
              </div>
            </div>

            {/* SUPER_ADMIN org selector */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Org ID:</span>
                <input
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-[360px] max-w-[60vw] px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                  placeholder="Paste organization UUID"
                />
                <Button variant="outline" size="sm" onClick={() => setSelectedOrgId(selectedOrgId.trim())}>
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!payload || !totals ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">No report data available.</p>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600">Total Needs</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totals.totalNeeds}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600">Open Needs</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {getCount(totals.statusMap, 'APPROVED_OPEN')}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600">In Progress</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {getCount(totals.statusMap, 'CLAIMED_IN_PROGRESS')}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600">Completed</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {getCount(totals.statusMap, 'COMPLETED')}
                </p>
              </div>
            </div>

            {/* Cycle times */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cycle Times (Average)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">Submitted → Approved</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {hoursToNice(payload.cycle_times?.avg_submit_to_approve_hours)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">Approved → Claimed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {hoursToNice(payload.cycle_times?.avg_approve_to_claim_hours)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">Claimed → Completed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {hoursToNice(payload.cycle_times?.avg_claim_to_complete_hours)}
                  </p>
                </div>
              </div>
            </div>

            {/* Distributions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs by Status</h3>
                <div className="space-y-2">
                  {payload.status_counts
                    .slice()
                    .sort((a, b) => b.value - a.value)
                    .map((x) => (
                      <div key={x.key} className="flex justify-between text-sm">
                        <span className="text-gray-700">{x.key}</span>
                        <span className="font-semibold text-gray-900">{x.value}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs by Type</h3>
                <div className="space-y-2">
                  {payload.type_counts
                    .slice()
                    .sort((a, b) => b.value - a.value)
                    .map((x) => (
                      <div key={x.key} className="flex justify-between text-sm">
                        <span className="text-gray-700">{x.key}</span>
                        <span className="font-semibold text-gray-900">{x.value}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs by Urgency</h3>
                <div className="space-y-2">
                  {payload.urgency_counts
                    .slice()
                    .sort((a, b) => b.value - a.value)
                    .map((x) => (
                      <div key={x.key} className="flex justify-between text-sm">
                        <span className="text-gray-700">{x.key}</span>
                        <span className="font-semibold text-gray-900">{x.value}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Trend + top groups */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs Created (Last 12 Weeks)</h3>
                {payload.created_weekly.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent data.</p>
                ) : (
                  <div className="space-y-2">
                    {payload.created_weekly.map((w) => (
                      <div key={w.week_start} className="flex justify-between text-sm">
                        <span className="text-gray-700">{w.week_start}</span>
                        <span className="font-semibold text-gray-900">{w.created_count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Groups (by Need Count)</h3>
                {payload.top_groups.length === 0 ? (
                  <p className="text-gray-500 text-sm">No group data.</p>
                ) : (
                  <div className="space-y-2">
                    {payload.top_groups.map((g) => (
                      <div key={g.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{g.name}</span>
                        <span className="font-semibold text-gray-900">{g.need_count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
