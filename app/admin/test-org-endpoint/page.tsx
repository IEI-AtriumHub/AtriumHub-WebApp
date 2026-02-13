"use client";

import { useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type ResultShape =
  | {
      status: number | "CLIENT_ERROR" | "SESSION_ERROR" | "VALIDATION_ERROR";
      sentAuthHeader?: boolean;
      sessionUser?: { id: string; email?: string | null } | null;
      request?: any;
      response?: any;
      error?: string;
    }
  | null;

function parseValue(raw: string) {
  const v = raw.trim();

  // allow explicit null
  if (v === "" || v.toLowerCase() === "null") return null;

  // booleans
  if (v.toLowerCase() === "true") return true;
  if (v.toLowerCase() === "false") return false;

  // numbers
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);

  // json
  if ((v.startsWith("{") && v.endsWith("}")) || (v.startsWith("[") && v.endsWith("]"))) {
    try {
      return JSON.parse(v);
    } catch {
      // fall through to string if JSON parse fails
    }
  }

  // default: string
  return v;
}

export default function TestOrgEndpoint() {
  const [orgId, setOrgId] = useState("ba3ef282-aec5-4abc-916d-d74c3cfc64ab");
  const [field, setField] = useState("allow_open_signup");
  const [value, setValue] = useState("false");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultShape>(null);

  // ✅ Use the same client pattern as the rest of the app (avoid multiple GoTrueClient instances)
  const supabase = useMemo(() => createClientComponentClient(), []);

  async function runTest() {
    setLoading(true);
    setResult(null);

    try {
      if (!orgId.trim() || !field.trim()) {
        setResult({
          status: "VALIDATION_ERROR",
          error: "orgId and field are required.",
        });
        return;
      }

      const patch: Record<string, any> = { [field.trim()]: parseValue(value) };

      // Pull access token from the browser session
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const sessionUser = sessionData.session?.user
        ? { id: sessionData.session.user.id, email: sessionData.session.user.email }
        : null;

      if (sessionErr) {
        setResult({
          status: "SESSION_ERROR",
          error: sessionErr.message,
        });
        return;
      }

      // If you're not logged in, don't even bother calling the API
      if (!accessToken) {
        setResult({
          status: 401,
          sentAuthHeader: false,
          sessionUser,
          response: { error: "No session access token found. Log in as SuperAdmin first." },
        });
        return;
      }

      const res = await fetch("/api/admin/orgs/update-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orgId: orgId.trim(), patch }),
      });

      const json = await res.json().catch(() => ({}));

      setResult({
        status: res.status,
        sentAuthHeader: true,
        sessionUser,
        request: { orgId: orgId.trim(), patch },
        response: json,
      });
    } catch (e: any) {
      setResult({
        status: "CLIENT_ERROR",
        error: e?.message ?? String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 8 }}>
        Admin Org Endpoint Test (temporary)
      </h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Calls <code>/api/admin/orgs/update-organization</code> using a Bearer token from the current browser session.
      </p>

      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Org ID</div>
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Field</div>
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Tip: You can set booleans (true/false), numbers (12, 3.14), JSON ({"{"}"a":1{"}"}), or null.
          </div>
        </label>

        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Value</div>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <button
          onClick={runTest}
          disabled={loading}
          style={{
            width: 180,
            margin: "10px auto 0",
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: "#111",
            color: "white",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Running..." : "Run test"}
        </button>

        <div
          style={{
            marginTop: 18,
            background: "#0b0b0b",
            color: "white",
            borderRadius: 16,
            padding: 18,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            whiteSpace: "pre-wrap",
            minHeight: 140,
          }}
        >
          {result
            ? `RESULT\n${JSON.stringify(result, null, 2)}`
            : `Click Run test.\nExpected: sentAuthHeader: true (when logged in as SuperAdmin).`}
        </div>
      </div>
    </div>
  );
}
