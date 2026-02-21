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

type BrandingPayload = {
  organization_id?: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null; // stored in features_override.branding
  app_name?: string | null; // stored in features_override.branding
};

export async function POST(req: Request) {
  try {
    // ----------------------------------------------------------------------------
    // 1) Auth (session) client using @supabase/ssr + async cookies (Next 15/16 safe)
    // ----------------------------------------------------------------------------
    const cookieStore = await cookies();
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server misconfigured', detail: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' },
        { status: 500 }
      );
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          // capture any cookie refresh attempts; we’ll apply them to the response at the end
          cookiesToSet.push(...cookies);
        },
      },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      const res = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    // ----------------------------------------------------------------------------
    // 2) SuperAdmin gate (email allowlist OR platform_admins table)
    // ----------------------------------------------------------------------------
    const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAIL_ALLOWLIST);
    const email = (user.email || '').toLowerCase();

    let isSuperAdmin = allowlist.length > 0 ? allowlist.includes(email) : false;

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
      const res = NextResponse.json({ error: 'Forbidden (SuperAdmin only)' }, { status: 403 });
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    // ----------------------------------------------------------------------------
    // 3) Input validation
    // ----------------------------------------------------------------------------
    const body = (await req.json().catch(() => null)) as BrandingPayload | null;

    const organization_id = body?.organization_id;
    const logo_url = body?.logo_url;
    const primary_color = body?.primary_color;
    const secondary_color = body?.secondary_color;
    const app_name = body?.app_name;

    if (!organization_id) {
      const res = NextResponse.json({ error: 'organization_id is required' }, { status: 400 });
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    if (primary_color != null && primary_color !== '' && !isValidHexColor(primary_color)) {
      const res = NextResponse.json({ error: 'primary_color must be a hex value like #1A2B3C' }, { status: 400 });
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    if (secondary_color != null && secondary_color !== '' && !isValidHexColor(secondary_color)) {
      const res = NextResponse.json({ error: 'secondary_color must be a hex value like #1A2B3C' }, { status: 400 });
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    // If truly nothing provided, no-op success
    const hasAny =
      logo_url !== undefined ||
      primary_color !== undefined ||
      secondary_color !== undefined ||
      app_name !== undefined;

    if (!hasAny) {
      const res = NextResponse.json({ ok: true, message: 'Nothing to update' });
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    // ----------------------------------------------------------------------------
    // 4) Admin (service role) client to bypass RLS safely (server-side only)
    // ----------------------------------------------------------------------------
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      const res = NextResponse.json(
        { error: 'Server misconfigured', detail: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ----------------------------------------------------------------------------
    // 5) Read existing org to merge features_override.branding (no new columns needed)
    // ----------------------------------------------------------------------------
    const { data: orgRow, error: orgErr } = await admin
      .from('organizations')
      .select('id, features_override')
      .eq('id', organization_id)
      .maybeSingle();

    if (orgErr) {
      const res = NextResponse.json(
        { error: 'Failed to load organization', detail: orgErr.message },
        { status: 500 }
      );
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    if (!orgRow?.id) {
      const res = NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    const currentOverrides =
      (orgRow.features_override && typeof orgRow.features_override === 'object'
        ? orgRow.features_override
        : {}) as Record<string, any>;

    const currentBranding =
      (currentOverrides.branding && typeof currentOverrides.branding === 'object'
        ? currentOverrides.branding
        : {}) as Record<string, any>;

    const nextBranding: Record<string, any> = { ...currentBranding };
    if (secondary_color !== undefined) nextBranding.secondary_color = secondary_color;
    if (app_name !== undefined) nextBranding.app_name = app_name;

    const nextOverrides: Record<string, any> = { ...currentOverrides, branding: nextBranding };

    // ----------------------------------------------------------------------------
    // 6) Build update payload (only columns you actually have + overrides)
    // ----------------------------------------------------------------------------
    const updatePayload: Record<string, any> = {};
    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (primary_color !== undefined) updatePayload.primary_color = primary_color;

    // Store secondary_color + app_name in features_override.branding (no schema change)
    if (secondary_color !== undefined || app_name !== undefined) {
      updatePayload.features_override = nextOverrides;
    }

    const { error: updErr } = await admin
      .from('organizations')
      .update(updatePayload)
      .eq('id', organization_id);

    if (updErr) {
      const res = NextResponse.json(
        { error: 'Failed to update organization branding', detail: updErr.message },
        { status: 500 }
      );
      cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    const res = NextResponse.json({ ok: true });
    cookiesToSet.forEach((c) => res.cookies.set(c.name, c.value, c.options));
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}