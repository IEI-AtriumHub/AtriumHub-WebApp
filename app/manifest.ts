import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

function isHexColor(x: string) {
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(x);
}

function hostToSlug(host: string | null) {
  if (!host) return null;
  // bethel.atriumhub.org -> bethel
  const h = host.split(':')[0].toLowerCase();
  const parts = h.split('.');
  if (parts.length >= 3) return parts[0]; // subdomain
  return null;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const { headers } = await import('next/headers');
const h = await headers();
const host = h.get('host');
  const slug = hostToSlug(host);

  let displayName = 'AtriumHub';
  let themeColor = '#111827'; // fallback
  let iconUrl: string | null = null;

  if (slug) {
    const sb = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data } = await sb
      .from('organizations')
      .select('display_name, primary_color, logo_url')
      .eq('slug', slug)
      .maybeSingle();

    if (data?.display_name) displayName = data.display_name;
    if (isHexColor((data?.primary_color || '').trim())) themeColor = data!.primary_color!.trim();
    if (data?.logo_url) iconUrl = data.logo_url.trim();
  }

  // NOTE: PWA icons must be same-origin for best compatibility.
  // Next step we’ll generate icons per org locally, but for now fallback to shared icons.
  return {
    name: displayName,
    short_name: displayName,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      // Later: per-org icons (maskable + apple-touch)
    ],
  };
}