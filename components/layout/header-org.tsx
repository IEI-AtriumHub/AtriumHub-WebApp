'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Dialog, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';

type HeaderProps = { onMenuClick?: () => void; };

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  adminOnly?: boolean;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
function isHexColor(x: string) {
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(x);
}

export default function HeaderOrg({ onMenuClick }: HeaderProps) {
  const { user, signOut, displayIsAdmin, organization } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Branding from org (safe fallbacks)
  const brandName =
  (organization?.display_name || '').trim() || 'AtriumHub';

  const logoUrl = (organization?.logo_url || '').trim() || null;

  const primary =
    isHexColor((organization?.primary_color || '').trim())
      ? (organization?.primary_color || '').trim()
      : '#7c3aed';

  const secondary =
    isHexColor((organization?.secondary_color || '').trim())
      ? (organization?.secondary_color || '').trim()
      : '#2563eb';

  const navItems: NavItem[] = useMemo(
    () => [
      { name: 'Home', href: '/', icon: HomeIcon },
      { name: 'Browse Needs', href: '/needs', icon: ClipboardDocumentListIcon },
      { name: 'In Progress', href: '/needs/in-progress', icon: ClipboardDocumentListIcon },
      { name: 'My Needs', href: '/my-needs', icon: ClipboardDocumentListIcon },
      { name: 'Create Need', href: '/needs/new', icon: PlusIcon },
      { name: 'Profile', href: '/profile', icon: UserCircleIcon },
      { name: 'Admin', href: '/admin', icon: UserGroupIcon, adminOnly: true },
    ],
    []
  );

  const visibleNav = useMemo(
    () => navItems.filter((i) => !i.adminOnly || !!displayIsAdmin),
    [navItems, displayIsAdmin]
  );

  const initials = (user?.full_name?.[0] || user?.email?.[0] || 'A').toUpperCase();

  const handleHamburgerClick = () => {
    if (onMenuClick) onMenuClick();
    else setMobileOpen(true);
  };
  const closeMobile = () => setMobileOpen(false);
  const go = (href: string) => { closeMobile(); router.push(href); };
  const handleSignOut = async () => { closeMobile(); await signOut(); };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleHamburgerClick}
                className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Open menu"
              >
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                <span className="sr-only">Open menu</span>
              </button>

              <Link href="/" className="flex items-center gap-2 min-w-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`${brandName} logo`}
                    className="h-9 w-9 rounded-lg object-cover border"
                  />
                ) : (
                  <div
                    className="h-9 w-9 rounded-lg text-white flex items-center justify-center font-semibold"
                    style={{ backgroundColor: primary }}
                  >
                    {initials}
                  </div>
                )}

                <span className="text-lg font-bold text-gray-900 truncate">
                  {brandName}
                </span>
              </Link>
            </div>

            <nav className="hidden sm:flex items-center gap-2">
              <Link
                href="/needs"
                className={classNames(
                  isActive('/needs') && !isActive('/needs/new') ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'px-3 py-1.5 rounded-md text-sm hover:bg-gray-100'
                )}
              >
                Browse
              </Link>
              <Link
                href="/my-needs"
                className={classNames(
                  isActive('/my-needs') ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  'px-3 py-1.5 rounded-md text-sm hover:bg-gray-100'
                )}
              >
                My Needs
              </Link>
              <Link
                href="/needs/new"
                className="px-3 py-1.5 rounded-md text-sm text-white"
                style={{ backgroundColor: secondary }}
              >
                + Create
              </Link>
              {displayIsAdmin && (
                <Link
                  href="/admin"
                  className={classNames(
                    isActive('/admin') ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'px-3 py-1.5 rounded-md text-sm hover:bg-gray-100'
                  )}
                >
                  Admin
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="hidden sm:inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Notifications"
              >
                <BellIcon className="h-6 w-6" aria-hidden="true" />
              </button>

              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-2 rounded-full p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <UserCircleIcon className="h-7 w-7" aria-hidden="true" />
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {user?.full_name || 'Account'}
                  </span>
                  <span className="sr-only">Open user menu</span>
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
                  <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-2">
                      <p className="text-xs text-gray-500">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.email || user?.full_name || 'User'}
                      </p>
                    </div>

                    <div className="border-t my-1" />

                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/profile"
                          className={classNames(
                            active ? 'bg-gray-100' : '',
                            'flex items-center gap-2 px-4 py-2 text-sm text-gray-700'
                          )}
                        >
                          <Cog6ToothIcon className="h-5 w-5" />
                          Profile / Settings
                        </Link>
                      )}
                    </Menu.Item>

                    {displayIsAdmin && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/admin"
                            className={classNames(
                              active ? 'bg-gray-100' : '',
                              'flex items-center gap-2 px-4 py-2 text-sm text-gray-700'
                            )}
                          >
                            <UserGroupIcon className="h-5 w-5" />
                            Admin
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    <div className="border-t my-1" />

                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={signOut}
                          className={classNames(
                            active ? 'bg-gray-100' : '',
                            'w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5" />
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

      {/* Mobile drawer can stay exactly as your existing file; keep this step focused */}
      {/* If you want, we’ll copy your existing mobile drawer block in Step 2. */}
    </>
  );
}