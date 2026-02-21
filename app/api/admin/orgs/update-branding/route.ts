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

export async function POST(req: Request) {
  // Cookie/session client (for authentication only)
  const supabase = createRouteHandlerClient({ cookies });

  // Service-role client (bypasses RLS for privileged operations)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Missing env: NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 });
  }
  if (!serviceKey) {
    return NextResponse.json({ error: 'Missing env: SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 1) Auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) SuperAdmin gate (email allowlist first = simplest + reliable)
  const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAIL_ALLOWLIST);
  const email = (user.email || '').toLowerCase();

  let isSuperAdmin = allowlist.length > 0 ? allowlist.includes(email) : false;

  // Optional: also try platform_admins table (use service role so RLS never blocks this check)
  if (!isSuperAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('platform_admins')
        .select('user_id, active, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to verify SuperAdmin (platform_admins)', detail: error.message },
          { status: 500 }
        );
      }

      const active =
        (data as any)?.is_active === true || (data as any)?.active === true || false;

      if (data?.user_id && active) isSuperAdmin = true;
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Failed to verify SuperAdmin (platform_admins)', detail: e?.message || String(e) },
        { status: 500 }
      );
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

  // 4) Update organizations (service role bypasses RLS)
  const updatePayload: Record<string, any> = {};
  if (logo_url !== undefined) updatePayload.logo_url = logo_url;
  if (primary_color !== undefined) updatePayload.primary_color = primary_color;
  if (secondary_color !== undefined) updatePayload.secondary_color = secondary_color;
  if (app_name !== undefined) updatePayload.app_name = app_name;

  // Optional: harmless if organizations has updated_at; if it doesn’t, remove this line.
  updatePayload.updated_at = new Date().toISOString();

  // If nothing to update, return success (no-op)
  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ ok: true, message: 'Nothing to update' });
  }

  const { error: updErr } = await supabaseAdmin
    .from('organizations')
    .update(updatePayload)
    .eq('id', organization_id);

  if (updErr) {
    return NextResponse.json(
      {
        error: 'Failed to update organization branding',
        detail: updErr.message,
        hint:
          'If this mentions missing columns (logo_url/primary_color/etc), we need to add them via a migration.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}