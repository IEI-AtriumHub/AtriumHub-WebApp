import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

function isHexColor(x: string) {
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(x);
}

function hostToSlug(host: string | null) {
  if (!host) return null;
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
  let themeColor = '#111827';

  if (slug) {
    const sb = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data } = await sb
      .from('organizations')
      .select('display_name, primary_color')
      .eq('slug', slug)
      .maybeSingle();

    if (data?.display_name) displayName = String(data.display_name);
    const p = String(data?.primary_color || '').trim();
    if (isHexColor(p)) themeColor = p;
  }

  return {
    name: displayName,
    short_name: displayName,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/icon/192?maskable', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon/512?maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}