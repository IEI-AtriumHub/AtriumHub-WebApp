// ============================================================================
// ROOT LAYOUT
// ============================================================================
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import OrgBrandFooter from '@/components/branding/OrgBrandFooter';
import './globals.css';
import RegisterSW from '@/components/pwa/RegisterSW';


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Needs Sharing Platform',
  description: 'Help your community by sharing and fulfilling needs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AuthProvider>
          <RegisterSW />
          <div className="min-h-screen flex flex-col">
            <ImpersonationBanner />
            <main className="flex-1">{children}</main>
            <OrgBrandFooter />
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