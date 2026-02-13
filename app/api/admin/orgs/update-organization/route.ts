import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "update-organization",
    ts: Date.now(),
  });
}

/**
 * Creates a Supabase SSR client authenticated via the user's cookie session.
 * IMPORTANT: In Next.js route handlers, use getAll/setAll (not get/set/remove)
 * so Supabase can properly read and refresh the session cookies.
 */
async function createCookieAuthedSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 1) Identify caller from cookie session (no Bearer token)
    const userClient = await createCookieAuthedSupabaseClient();
    const { data: userData, error: userErr } = await userClient.auth.getUser();

    if (userErr || !userData?.user) {
      // Debug payload (safe-ish): shows cookie names only, not values
      const cookieStore = await cookies();
      const cookieNames = cookieStore.getAll().map((c) => c.name);

      return NextResponse.json(
        {
          error: "Unauthorized",
          cookieNames,
          hasSbCookie: cookieNames.some((n) => n.startsWith("sb-")),
        },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // 2) SuperAdmin allowlist check
    const { data: adminRow, error: adminErr } = await userClient
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 400 });
    }

    if (!adminRow) {
      return NextResponse.json(
        { error: "Forbidden — SuperAdmin required" },
        { status: 403 }
      );
    }

    // 3) Parse body
    const body = await req.json().catch(() => null);
    const orgId = body?.orgId as string | undefined;
    const patch = body?.patch as Record<string, any> | undefined;

    if (!orgId || typeof orgId !== "string") {
      return NextResponse.json({ error: "Invalid or missing orgId" }, { status: 400 });
    }
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return NextResponse.json({ error: "Invalid patch payload" }, { status: 400 });
    }

    // Protect critical fields
    for (const field of ["id", "created_at"]) {
      if (field in patch) {
        return NextResponse.json(
          { error: `Cannot modify protected field: ${field}` },
          { status: 400 }
        );
      }
    }

    // 4) Execute update with service role (server-only)
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: updatedOrg, error: updateErr } = await adminClient
      .from("organizations")
      .update(patch)
      .eq("id", orgId)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ organization: updatedOrg }, { status: 200 });
  } catch (e: any) {
    console.error("Admin org update error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
