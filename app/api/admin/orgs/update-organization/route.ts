import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "update-organization",
    ts: Date.now(),
  });
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 1) Require a Bearer token (do NOT rely on cookies here)
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: missing Bearer token" },
        { status: 401 }
      );
    }

    // 2) Validate token -> userId
    const userAuthClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await userAuthClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: "Unauthorized: invalid session token" },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // 3) Service role client (server-only) for admin checks + update
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) SuperAdmin allowlist check (service role reads platform_admins safely)
    const { data: adminRow, error: adminErr } = await adminClient
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

    // 5) Parse body
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

    // 6) Execute update
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
