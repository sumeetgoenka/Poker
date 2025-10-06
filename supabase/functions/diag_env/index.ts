/* minimal env sanity without leaking secrets */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const SUPA_URL =
    Deno.env.get("SUPABASE_URL") ??
    Deno.env.get("PROJECT_URL") ??
    Deno.env.get("URL");

  const SERVICE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY");

  const urlOk = !!SUPA_URL && SUPA_URL.startsWith("http");
  const svcOk = !!SERVICE_KEY && SERVICE_KEY.startsWith("eyJ");

  // try a lightweight auth call to prove key works (no data returned)
  let ping = null, pingErr = null;
  if (urlOk && svcOk) {
    try {
      const admin = createClient(SUPA_URL!, SERVICE_KEY!);
      // hit a cheap endpoint (auth settings); ignore result
      const { data, error } = await admin.auth.getSettings();
      ping = !!data;
      pingErr = error?.message ?? null;
    } catch (e) {
      pingErr = String(e?.message ?? e);
    }
  }

  return new Response(
    JSON.stringify({
      ok: urlOk && svcOk && ping,
      urlDetected: SUPA_URL ?? null,
      serviceKeyLooksJWT: svcOk,
      pingOk: ping,
      pingErr,
    }),
    { headers: { "content-type": "application/json" } }
  );
});


