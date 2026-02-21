import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

function makeSupabaseServerClient() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // For this route we only need reads for auth; keep writes as no-ops to avoid runtime issues.
      set() {},
      remove() {},
    },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = makeSupabaseServerClient();

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

    // Optional: platform_admins fallback (won’t break if table differs)
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

    // 4) Build update payload
    const updatePayload: Record<string, any> = {};
    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (primary_color !== undefined) updatePayload.primary_color = primary_color;
    if (secondary_color !== undefined) updatePayload.secondary_color = secondary_color;
    if (app_name !== undefined) updatePayload.app_name = app_name;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: true, message: 'Nothing to update' });
    }

    // 5) Update (with graceful fallback if columns don’t exist yet)
    let { error: updErr } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', organization_id);

    // If prod DB doesn’t have the new columns yet, retry without them.
    if (updErr?.message?.toLowerCase().includes('secondary_color')) {
      delete updatePayload.secondary_color;
      ({ error: updErr } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', organization_id));
    }

    if (updErr?.message?.toLowerCase().includes('app_name')) {
      delete updatePayload.app_name;
      ({ error: updErr } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', organization_id));
    }

    if (updErr) {
      return NextResponse.json(
        {
          error: 'Failed to update organization branding',
          detail: updErr.message,
          hint:
            'If this mentions RLS or permissions, we will add a service-role update path next. If it mentions columns, we will add them next.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        detail: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}