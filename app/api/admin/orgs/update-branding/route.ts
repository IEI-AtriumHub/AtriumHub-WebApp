import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
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
  try {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server misconfigured', detail: 'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY' },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfigured', detail: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    // 1) USER-AUTH CLIENT (reads the logged-in session from cookies)
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // We don't need to set cookies in this route; keep it safe/no-op.
        setAll() {},
      },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2) SERVICE-ROLE CLIENT (bypasses RLS for controlled server-side updates)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 3) SuperAdmin gate
    const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAIL_ALLOWLIST);
    const email = (user.email || '').toLowerCase();

    let isSuperAdmin = allowlist.length > 0 ? allowlist.includes(email) : false;

    // Optional: confirm role from your public.users table (service role bypasses RLS)
    if (!isSuperAdmin) {
      try {
        const { data: urow } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (urow?.role === 'SUPER_ADMIN') isSuperAdmin = true;
      } catch {
        // ignore
      }
    }

    // Optional: platform_admins table
    if (!isSuperAdmin) {
      try {
        const { data: prow } = await supabaseAdmin
          .from('platform_admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prow?.user_id) isSuperAdmin = true;
      } catch {
        // ignore
      }
    }

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden (SuperAdmin only)' }, { status: 403 });
    }

    // 4) Input
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
      return NextResponse.json({ error: 'primary_color must be a hex value like #1A2B3C' }, { status: 400 });
    }

    if (secondary_color != null && secondary_color !== '' && !isValidHexColor(secondary_color)) {
      return NextResponse.json({ error: 'secondary_color must be a hex value like #1A2B3C' }, { status: 400 });
    }

    // 5) Build update payload (only defined fields)
    const updatePayload: Record<string, any> = {};
    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (primary_color !== undefined) updatePayload.primary_color = primary_color;
    if (secondary_color !== undefined) updatePayload.secondary_color = secondary_color;
    if (app_name !== undefined) updatePayload.app_name = app_name;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: true, message: 'Nothing to update' });
    }

    // 6) SAFE COLUMN FILTERING
    // Your organizations table (right now) does NOT include secondary_color/app_name.
    // So we detect existing columns and silently skip anything missing.
    const candidateColumns = Object.keys(updatePayload);

    const { data: cols, error: colErr } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'organizations')
      .in('column_name', candidateColumns);

    if (colErr) {
      return NextResponse.json(
        { error: 'Failed to introspect organizations columns', detail: colErr.message },
        { status: 500 }
      );
    }

    const existing = new Set((cols || []).map((c: any) => c.column_name));
    const filteredPayload: Record<string, any> = {};
    for (const key of candidateColumns) {
      if (existing.has(key)) filteredPayload[key] = updatePayload[key];
    }

    if (Object.keys(filteredPayload).length === 0) {
      return NextResponse.json({
        ok: true,
        message:
          'No matching columns exist in organizations for the submitted fields (nothing updated).',
        missingColumns: candidateColumns,
      });
    }

    // 7) Update organizations using service role (bypasses RLS)
    const { error: updErr } = await supabaseAdmin
      .from('organizations')
      .update(filteredPayload)
      .eq('id', organization_id);

    if (updErr) {
      return NextResponse.json(
        { error: 'Failed to update organization branding', detail: updErr.message, payload: filteredPayload },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, updated: Object.keys(filteredPayload) });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}