// ============================================================================
// PAGE CONTAINER COMPONENT
// ============================================================================

'use client';

import { ReactNode } from 'react';
import { useRequireApproval } from '@/context/AuthContext';
import Header from './header-org';
import { LoadingOverlay } from '../ui/Spinner';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  requireAuth?: boolean;
}

export function PageContainer({
  children,
  title,
  description,
  actions,
  requireAuth = true,
}: PageContainerProps) {
  const { loading } = requireAuth ? useRequireApproval() : { loading: false };

  if (loading) {
    return <LoadingOverlay message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          {(title || description || actions) && (
            <div className="mb-8">
              <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                  {title && (
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  )}
                  {description && (
                    <p className="mt-2 text-sm text-gray-600">{description}</p>
                  )}
                </div>
                {actions && (
                  <div className="mt-4 sm:mt-0 sm:ml-4">{actions}</div>
                )}
              </div>
            </div>
          )}

          {/* Page Content */}
          {children}
        </div>
      </main>
    </div>
  );
}

export default PageContainer;
