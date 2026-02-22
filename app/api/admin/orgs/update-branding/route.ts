// app/api/admin/orgs/update-branding/route.ts
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

function isRecord(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export async function POST(req: Request) {
  try {
    const SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;
    const SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: 'Server misconfigured',
          detail:
            'Missing SUPABASE env vars. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 500 }
      );
    }

    // --- Auth (App Router / Next 16 safe) ---
    const cookieStore = await cookies();

    const supabaseAuthed = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        // Read cookies from Next.js
        getAll() {
          return cookieStore.getAll();
        },
        // Write cookies back (needed if Supabase refreshes session)
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // In route handlers, cookies() is typically writable
              // If Next returns a readonly store in your environment, this try/catch prevents crashes.
              (cookieStore as any).set(name, value, options);
            });
          } catch {
            // no-op
          }
        },
      },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuthed.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // --- Service-role client for privileged reads/writes (bypasses RLS safely on server) ---
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // --- SuperAdmin gate ---
    const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAIL_ALLOWLIST);
    const email = (user.email || '').toLowerCase();

    let isSuperAdmin = allowlist.length > 0 ? allowlist.includes(email) : false;

    // Optional: platform_admins table check
    if (!isSuperAdmin) {
      const { data } = await supabaseAdmin
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.user_id) isSuperAdmin = true;
    }

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden (SuperAdmin only)' },
        { status: 403 }
      );
    }

    // --- Input ---
    const body = await req.json().catch(() => null);

    const organization_id = body?.organization_id as string | undefined;
    const logo_url = body?.logo_url as string | null | undefined;
    const primary_color = body?.primary_color as string | null | undefined;
    const secondary_color = body?.secondary_color as string | null | undefined;
    const app_name = body?.app_name as string | null | undefined;

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    if (
      primary_color != null &&
      primary_color !== '' &&
      !isValidHexColor(primary_color)
    ) {
      return NextResponse.json(
        { error: 'primary_color must be a hex value like #1A2B3C' },
        { status: 400 }
      );
    }

    if (
      secondary_color != null &&
      secondary_color !== '' &&
      !isValidHexColor(secondary_color)
    ) {
      return NextResponse.json(
        { error: 'secondary_color must be a hex value like #1A2B3C' },
        { status: 400 }
      );
    }

    // --- Build update payload using columns you *already have* ---
    // From your list: organizations has logo_url + primary_color + features_override (and NOT secondary_color/app_name yet)
    const updatePayload: Record<string, any> = {};
    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (primary_color !== undefined) updatePayload.primary_color = primary_color;

    // Store "future" branding fields inside features_override.branding so we don't need new columns yet
    const wantsBrandingExtras =
      secondary_color !== undefined || app_name !== undefined;

    if (wantsBrandingExtras) {
      const { data: orgRow, error: orgErr } = await supabaseAdmin
        .from('organizations')
        .select('features_override')
        .eq('id', organization_id)
        .maybeSingle();

      if (orgErr) {
        return NextResponse.json(
          { error: 'Failed reading organization', detail: orgErr.message },
          { status: 500 }
        );
      }

      const existing = isRecord(orgRow?.features_override)
        ? orgRow!.features_override
        : {};

      const existingBranding = isRecord(existing.branding) ? existing.branding : {};

      const nextBranding = {
        ...existingBranding,
        ...(secondary_color !== undefined ? { secondary_color } : {}),
        ...(app_name !== undefined ? { app_name } : {}),
      };

      updatePayload.features_override = {
        ...existing,
        branding: nextBranding,
      };
    }

    // If nothing to update, return success
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
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}