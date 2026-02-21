// ============================================================================
// ROOT LAYOUT
// ============================================================================
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Needs Sharing Platform',
  description: 'Help your community by sharing and fulfilling needs',
};

function PoweredByFooter() {
  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center text-xs text-gray-500">
          Powered by <span className="font-medium text-gray-700">AtriumHub</span> —{' '}
          <span className="font-medium text-gray-700">IEI</span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <ImpersonationBanner />
            <main className="flex-1">{children}</main>
            <PoweredByFooter />
          </div>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}