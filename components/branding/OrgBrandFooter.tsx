'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/**
 * OrgBrandFooter
 * - Always shows: "Powered by AtriumHub — IEI"
 * - Optionally shows org name (subtle) when available
 * - Safe: does not assume org exists; never breaks logged-out routes
 */
export default function OrgBrandFooter() {
  const { organization } = useAuth();

  const orgLabel = useMemo(() => {
    const name = organization?.display_name?.trim();
    return name ? name : null;
  }, [organization?.display_name]);

  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col items-center gap-1 text-xs text-gray-500">
          {orgLabel && (
            <div className="text-gray-600">
              <span className="font-medium text-gray-700">{orgLabel}</span>
            </div>
          )}

          <div className="text-center">
            Powered by <span className="font-medium text-gray-700">AtriumHub</span> —{' '}
            <span className="font-medium text-gray-700">IEI</span>
            <span className="mx-2 text-gray-300">•</span>
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              Home
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
