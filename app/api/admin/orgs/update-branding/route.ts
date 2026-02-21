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

function safeJson(value: any) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    // -----------------------------------------------------------------------
    // 1) Auth (cookie session) - use anon client only for identity checks
    // -----------------------------------------------------------------------
    const supabaseAuth = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // -----------------------------------------------------------------------
    // 2) SuperAdmin gate (allowlist OR platform_admins)
    // -----------------------------------------------------------------------
    const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAIL_ALLOWLIST);
    const email = (user.email || '').toLowerCase();

    let isSuperAdmin = allowlist.length > 0 ? allowlist.includes(email) : false;

    if (!isSuperAdmin) {
      try {
        const { data } = await supabaseAuth
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

    // -----------------------------------------------------------------------
    // 3) Input validation
    // -----------------------------------------------------------------------
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

    // If literally nothing provided, no-op
    if (
      logo_url === undefined &&
      primary_color === undefined &&
      secondary_color === undefined &&
      app_name === undefined
    ) {
      return NextResponse.json({ ok: true, message: 'Nothing to update' });
    }

    // -----------------------------------------------------------------------
    // 4) Service role client for the update (rock-solid, bypass RLS safely)
    // -----------------------------------------------------------------------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server is missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Fetch current features_override so we can merge branding without clobbering other overrides
    const { data: orgRow, error: fetchErr } = await supabaseAdmin
      .from('organizations')
      .select('id, features_override')
      .eq('id', organization_id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json(
        { error: 'Failed to fetch organization', detail: fetchErr.message },
        { status: 500 }
      );
    }

    if (!orgRow?.id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const currentOverrides = safeJson(orgRow.features_override);
    const nextOverrides = {
      ...currentOverrides,
      branding: {
        ...(currentOverrides?.branding || {}),
        ...(secondary_color !== undefined ? { secondary_color } : {}),
        ...(app_name !== undefined ? { app_name } : {}),
      },
    };

    // Build update payload ONLY with columns that exist today + merged features_override
    const updatePayload: Record<string, any> = {
      features_override: nextOverrides,
    };

    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (primary_color !== undefined) updatePayload.primary_color = primary_color;

    const { error: updErr } = await supabaseAdmin
      .from('organizations')
      .update(updatePayload)
      .eq('id', organization_id);

    if (updErr) {
      return NextResponse.json(
        { error: 'Failed to update organization branding', detail: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // This catches the “cookies.get is not a function” type crashes too
    return NextResponse.json(
      { error: 'Internal Server Error', detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}