"use client";

import { useState } from "react";

export default function TestOrgEndpoint() {
  const [orgId, setOrgId] = useState("ba3ef282-aec5-4abc-916d-d74c3cfc64ab");
  const [field, setField] = useState("allow_open_signup");
  const [value, setValue] = useState("false");
  const [result, setResult] = useState<string>("");

  async function runTest() {
    setResult("Running...");
    try {
      const patch: any = {};
      // simple boolean coercion
      patch[field] = value === "true";

      const res = await fetch("/api/admin/orgs/update-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, patch }),
      });

      const text = await res.text();
      setResult(`STATUS ${res.status}\n\n${text}`);
    } catch (e: any) {
      setResult(`ERROR\n\n${e?.message ?? String(e)}`);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        Admin Org Endpoint Test (temporary)
      </h1>

      <p style={{ marginBottom: 16 }}>
        This calls <code>/api/admin/orgs/update-organization</code> using your cookie session (no tokens).
      </p>

      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <label>
          Org ID<br />
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Field<br />
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Value (true/false)<br />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <button
          onClick={runTest}
          style={{ padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
        >
          Run test
        </button>
      </div>

      <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#eee", padding: 12 }}>
        {result}
      </pre>
    </div>
  );
}
