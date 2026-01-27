// ============================================================================
// HEADER COMPONENT
// ============================================================================

'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, organization, signOut, isAdmin } = useAuth();
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Browse Needs', href: '/needs' },
    { name: 'My Needs', href: '/my-needs' },
  ];

  if (isAdmin) {
    navigation.push({ name: 'Admin', href: '/admin', adminOnly: true });
    navigation.push({ name: 'Reports', href: '/admin/reports', adminOnly: true });
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo and Navigation */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden -ml-2 mr-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: organization?.primary_color || '#3b82f6' }}
              >
                {organization?.display_name?.charAt(0) || 'N'}
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900 hidden sm:block">
                {organization?.display_name || 'Needs Platform'}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:ml-8 lg:flex lg:space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              type="button"
              className="rounded-full p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* User Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 rounded-full p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                <span className="sr-only">Open user menu</span>
                <UserCircleIcon className="h-6 w-6" />
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.full_name}
                </span>
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>

                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/profile"
                        className={cn(
                          'flex items-center px-4 py-2 text-sm',
                          active ? 'bg-gray-100' : ''
                        )}
                      >
                        <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                        Profile
                      </Link>
                    )}
                  </Menu.Item>

                  {isAdmin && (
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/admin/settings"
                          className={cn(
                            'flex items-center px-4 py-2 text-sm',
                            active ? 'bg-gray-100' : ''
                          )}
                        >
                          <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                          Settings
                        </Link>
                      )}
                    </Menu.Item>
                  )}

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={signOut}
                        className={cn(
                          'flex w-full items-center px-4 py-2 text-sm text-red-600',
                          active ? 'bg-gray-100' : ''
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;