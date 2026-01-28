'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user, loading, signOut, displayIsAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.status === 'PENDING') {
      router.push('/pending-approval');
    }
  }, [user, loading, router]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3">
            {/* Top row: Brand + user actions */}
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">AtriumHub</h1>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Welcome, {user.full_name}</span>
                <Link href="/profile">
                  <Button variant="outline" size="sm">Profile</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
              </div>
            </div>

            {/* User top menu */}
            <nav className="flex flex-wrap items-center gap-2">
              <Link href="/needs">
                <Button variant="outline" size="sm">Browse Needs</Button>
              </Link>

              <Link href="/my-needs">
                <Button variant="outline" size="sm">My Needs</Button>
              </Link>

              <Link href="/needs/new">
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create a Need
                </Button>
              </Link>

              {displayIsAdmin && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">Admin</Button>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome to AtriumHub
          </h2>
          <p className="text-gray-600">
            Your needs-sharing platform. What would you like to do?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/needs" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Browse Needs</h3>
              <p className="text-sm text-gray-600">View and claim available needs</p>
            </div>
          </Link>

          <Link href="/my-needs" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <PlusIcon className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">My Needs</h3>
              <p className="text-sm text-gray-600">Manage your submitted needs</p>
            </div>
          </Link>

          {displayIsAdmin && (
            <Link href="/admin" className="block">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <UserGroupIcon className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Admin Panel</h3>
                <p className="text-sm text-gray-600">Manage users and approvals</p>
              </div>
            </Link>
          )}

          <Link href="/profile" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <Cog6ToothIcon className="h-8 w-8 text-gray-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
              <p className="text-sm text-gray-600">Update your profile</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
