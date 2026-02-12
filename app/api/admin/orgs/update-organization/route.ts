import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Healthcheck: confirms route is deployed and reachable
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "update-organization",
    ts: Date.now(),
  });
}

// Creates a Supabase client that reads the logged-in user from cookies (server-side)
function createCookieAuthedSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 1) Identify caller from cookie session (NO bearer token needed)
    const userClient = createCookieAuthedSupabaseClient();
    const { data: userData, error: userErr } = await userClient.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // 2) SuperAdmin check
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

    // 3) Parse & validate body
    const body = await req.json();
    const { orgId, patch } = body ?? {};

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

    return NextResponse.json({ organization: updatedOrg });
  } catch (e: any) {
    console.error("Admin org update error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
