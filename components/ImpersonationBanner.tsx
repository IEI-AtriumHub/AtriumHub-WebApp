'use client';

import { useAuth } from '@/context/AuthContext';
import { XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';

export default function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, stopImpersonation } = useAuth();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between z-50 sticky top-0">
      <div className="flex items-center gap-3">
        <EyeIcon className="h-5 w-5" />
        <span className="font-medium">
          Viewing as: <strong>{impersonatedUser.full_name || impersonatedUser.email}</strong>
        </span>
        <span className="text-amber-100 text-sm">
          ({impersonatedUser.email})
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded-md transition-colors"
      >
        <XMarkIcon className="h-4 w-4" />
        <span>Exit Impersonation</span>
      </button>
    </div>
  );
}