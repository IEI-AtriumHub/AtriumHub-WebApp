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

// Only update columns we KNOW exist (based on your current organizations columns list)
const ORG_COLUMNS = {
  logo_url: true,
  primary_color: true,
  // secondary_color: false (NOT in your table yet)
  // app_name: false (NOT in your table yet)
};

export async function POST(req: Request) {
  try {
    // --- 0) Env sanity (fail fast, clear error) ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server misconfigured', detail: 'Missing SUPABASE env vars on server.' },
        { status: 500 }
      );
    }

    // --- 1) Cookie-auth client (identify the caller via their session) ---
    // Next.js 16 cookies() is async *by type*; keep it as a Promise for auth-helpers typing.
    const cookieStorePromise = cookies();

    const supabaseAuthed = createRouteHandlerClient({
      cookies: () => cookieStorePromise, // must return Promise<ReadonlyRequestCookies>
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuthed.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // --- 2) Admin client (bypasses RLS for controlled writes) ---
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // --- 3) SuperAdmin gate (allowlist OR platform_admins table) ---
    const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAIL_ALLOWLIST);
    const email = (user.email || '').toLowerCase();

    let isSuperAdmin = allowlist.length > 0 ? allowlist.includes(email) : false;

    if (!isSuperAdmin) {
      const { data: pa, error: paErr } = await supabaseAdmin
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!paErr && pa?.user_id) isSuperAdmin = true;
    }

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden (SuperAdmin only)' }, { status: 403 });
    }

    // --- 4) Input ---
    const body = await req.json().catch(() => null);

    const organization_id = body?.organization_id as string | undefined;
    const logo_url = body?.logo_url as string | null | undefined;
    const primary_color = body?.primary_color as string | null | undefined;

    // Present in UI today but NOT in table yet — accept but ignore safely
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

    // --- 5) Build update payload (only known columns) ---
    const updatePayload: Record<string, any> = {};
    const ignored_fields: string[] = [];

    if (logo_url !== undefined && ORG_COLUMNS.logo_url) updatePayload.logo_url = logo_url;
    if (primary_color !== undefined && ORG_COLUMNS.primary_color) updatePayload.primary_color = primary_color;

    if (secondary_color !== undefined) ignored_fields.push('secondary_color');
    if (app_name !== undefined) ignored_fields.push('app_name');

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'Nothing to update (or only fields not yet supported).',
        ignored_fields,
      });
    }

    // --- 6) Update via service role (RLS-proof) ---
    const { error: updErr } = await supabaseAdmin
      .from('organizations')
      .update(updatePayload)
      .eq('id', organization_id);

    if (updErr) {
      return NextResponse.json(
        { error: 'Failed to update organization branding', detail: updErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, ignored_fields });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}