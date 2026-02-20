import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

// Enterprise rule:
// If you're in `platform_admins`, you're a super admin.
async function isSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data?.user_id) return true;

  return false;
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Server not configured (missing SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Missing bearer token" },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } =
      await supabase.auth.getUser(token);

    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    const ok = await isSuperAdmin(supabase, userId);

    if (!ok) {
      return NextResponse.json(
        { error: "Forbidden (not a platform admin)" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const display_name = String(body.display_name ?? "").trim();
    const primary_color = String(body.primary_color ?? "#3b82f6").trim();
    const allow_open_signup = Boolean(body.allow_open_signup ?? false);
    const is_active =
      body.is_active === undefined ? true : Boolean(body.is_active);

    const rawSlug = String(body.slug ?? "").trim();
    const slug = slugify(rawSlug || display_name);

    if (!display_name) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: existErr } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (existErr) {
      return NextResponse.json(
        { error: existErr.message },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    }

    const { data: created, error: createErr } = await supabase
      .from("organizations")
      .insert([
        {
          display_name,
          slug,
          primary_color,
          allow_open_signup,
          is_active,
        },
      ])
      .select("*")
      .single();

    if (createErr) {
      return NextResponse.json(
        { error: createErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { organization: created },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
