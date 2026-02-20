'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

type HeaderProps = {
  onMenuClick?: () => void; // optional external handler
};

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  adminOnly?: boolean;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut, displayIsAdmin } = useAuth();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleHamburgerClick = () => {
    // If a parent provided a handler, call it.
    // Otherwise open our internal mobile drawer so the button always works.
    if (onMenuClick) onMenuClick();
    else setMobileOpen(true);
  };

  return (
    <>
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Left: Hamburger + Brand */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleHamburgerClick}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Open menu"
              >
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                <span className="sr-only">Open menu</span>
              </button>

              <Link href="/" className="flex items-center gap-2">
                {/* You can swap this for a logo later */}
                <div className="h-9 w-9 rounded-lg bg-purple-600 text-white flex items-center justify-center font-semibold">
                  {user?.full_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <span className="text-lg font-bold text-gray-900">AtriumHub</span>
              </Link>
            </div>

            {/* Right: icons + user menu */}
            <div className="flex items-center gap-2">
              {/* Optional: notification icon placeholder */}
              <button
                type="button"
                className="hidden sm:inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Notifications"
              >
                <BellIcon className="h-6 w-6" aria-hidden="true" />
              </button>

              {/* User Menu */}
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

      {/* MOBILE DRAWER (only used when no onMenuClick is provided) */}
      <Transition.Root show={mobileOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setMobileOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-200 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-200 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative w-[85%] max-w-sm bg-white shadow-xl">
                <div className="flex items-center justify-between px-4 py-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-600 text-white flex items-center justify-center font-semibold">
                      {user?.full_name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {user?.full_name || 'AtriumHub'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <nav className="px-2 py-3">
                  <div className="space-y-1">
                    {visibleNav.map((item) => {
                      const isActive =
                        item.href === '/'
                          ? pathname === '/'
                          : pathname?.startsWith(item.href);

                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={classNames(
                            isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50',
                            'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium'
                          )}
                        >
                          <Icon className={classNames(isActive ? 'text-blue-700' : 'text-gray-400', 'h-5 w-5')} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="mt-4 border-t pt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        setMobileOpen(false);
                        await signOut();
                      }}
                      className="w-full flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-400" />
                      Sign out
                    </button>
                  </div>
                </nav>
              </Dialog.Panel>
            </Transition.Child>

            {/* spacer */}
            <div className="flex-1" />
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}

export default Header;
