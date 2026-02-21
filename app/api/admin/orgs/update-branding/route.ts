import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

function safeString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? '' : t;
}

export async function POST(req: Request) {
  try {
    // 0) Required env for service client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          error: 'Server misconfigured',
          detail:
            'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on the server.',
        },
        { status: 500 }
      );
    }

    // 1) User session client (cookie auth) — ONLY for identifying the caller
    const supabaseUser = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2) Service-role client — for SuperAdmin check (platform_admins) + update
    const supabaseService = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // 3) SuperAdmin gate
    const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAIL_ALLOWLIST);
    const email = (user.email || '').toLowerCase();
    let isSuperAdmin = allowlist.length > 0 ? allowlist.includes(email) : false;

    if (!isSuperAdmin) {
      const { data: pa, error: paErr } = await supabaseService
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (paErr) {
        // Don't fail hard here; just report if you want to debug
        // (but still keep it forbidden unless allowlist hits)
      }
      if (pa?.user_id) isSuperAdmin = true;
    }

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden (SuperAdmin only)' },
        { status: 403 }
      );
    }

    // 4) Input
    const body = await req.json().catch(() => null);

    const organization_id = safeString(body?.organization_id) as
      | string
      | undefined;

    const logo_url = safeString(body?.logo_url);
    const primary_color = safeString(body?.primary_color);
    const secondary_color = safeString(body?.secondary_color);
    const app_name = safeString(body?.app_name);

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
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

    // 5) Update payload (only include provided fields)
    const updatePayload: Record<string, any> = {};
    if (logo_url !== undefined) updatePayload.logo_url = logo_url === '' ? null : logo_url;
    if (primary_color !== undefined) updatePayload.primary_color = primary_color === '' ? null : primary_color;
    if (secondary_color !== undefined) updatePayload.secondary_color = secondary_color === '' ? null : secondary_color;
    if (app_name !== undefined) updatePayload.app_name = app_name === '' ? null : app_name;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: true, message: 'Nothing to update' });
    }

    // 6) Perform update using service role (avoids RLS surprises)
    const { data: updated, error: updErr } = await supabaseService
      .from('organizations')
      .update(updatePayload)
      .eq('id', organization_id)
      .select('id, display_name, logo_url, primary_color, secondary_color, app_name')
      .maybeSingle();

    if (updErr) {
      return NextResponse.json(
        {
          error: 'Failed to update organization branding',
          detail: updErr.message,
          code: (updErr as any).code,
          hint:
            'If this mentions missing columns (logo_url/primary_color/secondary_color/app_name), we need to add them via a migration.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, organization: updated });
  } catch (e: any) {
    // Absolute last-resort: never leak a blank 500
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        detail: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}
