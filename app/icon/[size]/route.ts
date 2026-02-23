import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

function hostToSlug(host: string | null) {
  if (!host) return null;
  const h = host.split(':')[0].toLowerCase();
  const parts = h.split('.');
  if (parts.length >= 3) return parts[0];
  return null;
}

function clampSize(size: number) {
  const allowed = [48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];
  if (allowed.includes(size)) return size;
  if (size >= 32 && size <= 1024) return size;
  return 192;
}

function isHexColor(x: string) {
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(x);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ size: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // ✅ Next 16 requires awaiting params
    const { size: sizeParam } = await context.params;
    const size = clampSize(parseInt(sizeParam, 10) || 192);

    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('host');
    const slug = hostToSlug(host);

    let displayName = 'AtriumHub';
    let logoUrl: string | null = null;
    let primary = '#111827';

    if (slug) {
      const sb = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data } = await sb
        .from('organizations')
        .select('display_name, logo_url, primary_color')
        .eq('slug', slug)
        .maybeSingle();

      if (data?.display_name) displayName = String(data.display_name);
      if (data?.logo_url) logoUrl = String(data.logo_url).trim() || null;

      const p = String(data?.primary_color || '').trim();
      if (isHexColor(p)) primary = p;
    }

    const initial = (displayName.trim()[0] || 'A').toUpperCase();
    const radius = Math.round(size * 0.18);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <clipPath id="r">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" />
    </clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="${size}" height="${size}" fill="${primary}" />
    ${
      logoUrl
        ? `<image href="${logoUrl}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" />`
        : `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
            font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
            font-size="${Math.round(size * 0.52)}"
            font-weight="800"
            fill="#ffffff">${initial}</text>`
    }
  </g>
</svg>`;

    const img = React.createElement('img', {
      alt: 'icon',
      src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      width: size,
      height: size,
    });

    const png = new ImageResponse(img as any, {
      width: size,
      height: size,
    });

    return new NextResponse(png.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('Icon route error:', e);
    return NextResponse.json({ error: 'Icon generation failed' }, { status: 500 });
  }
}