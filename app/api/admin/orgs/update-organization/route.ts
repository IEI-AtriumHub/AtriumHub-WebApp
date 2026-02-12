import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Healthcheck so we can verify the route is deployed and reachable in prod
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "update-organization",
    ts: Date.now(),
  });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Validate caller session (user-scoped)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // SuperAdmin check
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

    // Parse request body
    const body = await req.json();
    const { orgId, patch } = body ?? {};

    if (!orgId || typeof orgId !== "string") {
      return NextResponse.json({ error: "Invalid or missing orgId" }, { status: 400 });
    }

    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return NextResponse.json({ error: "Invalid patch payload" }, { status: 400 });
    }

    // Protect critical fields from mutation
    const protectedFields = ["id", "created_at"];
    for (const field of protectedFields) {
      if (field in patch) {
        return NextResponse.json(
          { error: `Cannot modify protected field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Service-role mutation (server-only)
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: updatedOrg, error: updateError } = await adminClient
      .from("organizations")
      .update(patch)
      .eq("id", orgId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ organization: updatedOrg });
  } catch (err: any) {
    console.error("Admin org update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
