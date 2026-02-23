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

type HeaderProps = { onMenuClick?: () => void };

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

  const brandName = (organization?.display_name || '').trim() || 'AtriumHub';
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

  const go = (href: string) => {
    closeMobile();
    router.push(href);
  };

  const handleSignOut = async () => {
    // Close any overlays first, then sign out.
    closeMobile();
    await signOut();
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* LEFT */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleHamburgerClick}
                className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Open menu"
              >
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
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
                <span className="text-lg font-bold text-gray-900 truncate">{brandName}</span>
              </Link>
            </div>

            {/* DESKTOP NAV */}
            <nav className="hidden sm:flex items-center gap-2">
              <Link
                href="/needs"
                className={classNames(
                  isActive('/needs') ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
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

            {/* USER MENU */}
            <div className="flex items-center gap-2">
              <button className="hidden sm:inline-flex p-2 text-gray-500 hover:bg-gray-100 rounded-md">
                <BellIcon className="h-6 w-6" />
              </button>

              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-2 rounded-full p-1.5 hover:bg-gray-100">
                  <UserCircleIcon className="h-7 w-7 text-gray-500" />
                  <span className="hidden sm:inline text-sm">{user?.full_name || 'Account'}</span>
                </Menu.Button>

                <Transition as={Fragment}>
                  <Menu.Items className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black/5">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/profile"
                          className={classNames(active && 'bg-gray-100', 'flex gap-2 px-4 py-2 text-sm')}
                        >
                          <Cog6ToothIcon className="h-5 w-5" /> Profile
                        </Link>
                      )}
                    </Menu.Item>

                    {displayIsAdmin && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/admin"
                            className={classNames(active && 'bg-gray-100', 'flex gap-2 px-4 py-2 text-sm')}
                          >
                            <UserGroupIcon className="h-5 w-5" /> Admin
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          // IMPORTANT: use mousedown so the action happens before the menu unmounts.
                          onMouseDown={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await handleSignOut();
                          }}
                          className={classNames(
                            active && 'bg-gray-100',
                            'w-full text-left flex gap-2 px-4 py-2 text-sm'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5" /> Sign out
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

      {/* MOBILE DRAWER */}
      <Transition.Root show={mobileOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 sm:hidden" onClose={setMobileOpen}>
          <div className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 flex">
            <Dialog.Panel className="relative w-[85%] max-w-sm bg-white shadow-xl">
              <div className="flex items-center justify-between px-4 py-4 border-b">
                <div className="font-semibold">{brandName}</div>
                <button onClick={closeMobile}>
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="px-2 py-3 space-y-1">
                {visibleNav.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => go(item.href)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
                  >
                    {item.name}
                  </button>
                ))}

                <div className="border-t my-3" />

                <button onClick={handleSignOut} className="w-full text-left px-3 py-2 hover:bg-gray-100">
                  Sign out
                </button>
              </div>
            </Dialog.Panel>
            <div className="flex-1" />
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}