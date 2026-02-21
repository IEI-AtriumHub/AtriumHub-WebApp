import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

function parseAllowlist(value?: string) {
  return (value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isValidHexColor(v: unknown) {
  if (typeof v !== 'string') return false;
  return /^#([0-9a-fA-F]{6})$/.test(v.trim());
}

function safeObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

export async function POST(req: Request) {
  // ✅ IMPORTANT: use a cookieStore instance (cookies()) — fixes "get is not a function"
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // 1) Auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) SuperAdmin gate (email allowlist first)
  const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAIL_ALLOWLIST);
  const email = (user.email || '').toLowerCase();

  let isSuperAdmin = allowlist.length > 0 ? allowlist.includes(email) : false;

  // Optional: also try platform_admins table
  if (!isSuperAdmin) {
    try {
      const { data } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.user_id) isSuperAdmin = true;
    } catch {
      // ignore
    }
  }

  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden (SuperAdmin only)' }, { status: 403 });
  }

  // 3) Input
  const body = await req.json().catch(() => null);

  const organization_id = body?.organization_id as string | undefined;
  const logo_url = body?.logo_url as string | null | undefined;
  const primary_color = body?.primary_color as string | null | undefined;
  const secondary_color = body?.secondary_color as string | null | undefined;
  const app_name = body?.app_name as string | null | undefined;

  if (!organization_id) {
    return NextResponse.json({ error: 'organization_id is required' }, { status: 400 });
  }

  if (primary_color != null && primary_color !== '' && !isValidHexColor(primary_color)) {
    return NextResponse.json(
      { error: 'primary_color must be a hex value like #1A2B3C' },
      { status: 400 }
    );
  }

  if (secondary_color != null && secondary_color !== '' && !isValidHexColor(secondary_color)) {
    return NextResponse.json(
      { error: 'secondary_color must be a hex value like #1A2B3C' },
      { status: 400 }
    );
  }

  // 4) Service role client (bypasses RLS)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing SUPABASE env vars' },
      { status: 500 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 5) Build update payload
  // Your organizations table currently has: logo_url, primary_color, features_override
  // It does NOT have: secondary_color, app_name
  // So we store those under features_override.branding
  const updatePayload: Record<string, any> = {};

  if (logo_url !== undefined) updatePayload.logo_url = logo_url;
  if (primary_color !== undefined) updatePayload.primary_color = primary_color;

  // Only touch features_override if secondary_color or app_name was provided
  if (secondary_color !== undefined || app_name !== undefined) {
    const { data: existing, error: readErr } = await admin
      .from('organizations')
      .select('features_override')
      .eq('id', organization_id)
      .maybeSingle();

    if (readErr) {
      return NextResponse.json(
        { error: 'Failed to read existing organization features_override', detail: readErr.message },
        { status: 400 }
      );
    }

    const current = safeObject(existing?.features_override);
    const currentBranding = safeObject(current.branding);

    const nextBranding = {
      ...currentBranding,
      ...(app_name !== undefined ? { app_name } : {}),
      ...(secondary_color !== undefined ? { secondary_color } : {}),
    };

    updatePayload.features_override = {
      ...current,
      branding: nextBranding,
    };
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ ok: true, message: 'Nothing to update' });
  }

  const { error: updErr } = await admin
    .from('organizations')
    .update(updatePayload)
    .eq('id', organization_id);

  if (updErr) {
    return NextResponse.json(
      {
        error: 'Failed to update organization branding',
        detail: updErr.message,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}