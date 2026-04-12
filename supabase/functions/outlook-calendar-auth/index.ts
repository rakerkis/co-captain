import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const clientId = Deno.env.get("OUTLOOK_CLIENT_ID");
    const clientSecret = Deno.env.get("OUTLOOK_CLIENT_SECRET");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/outlook-calendar-auth/callback`;

    // Handle OAuth callback — no auth header needed (Microsoft redirects here)
    if (path === "callback" && req.method === "GET") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code) {
        throw new Error("No authorization code received");
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId!,
            client_secret: clientSecret!,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            scope: "Calendars.Read offline_access openid profile email",
          }),
        }
      );

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", tokens);
        throw new Error("Failed to exchange code for tokens");
      }

      // Parse state to get user ID and optional redirect scheme (for native apps)
      const parsedState = state ? JSON.parse(state) : {};
      const userId = parsedState.userId ?? null;
      const redirectScheme = parsedState.redirectScheme ?? null;

      if (!userId) {
        throw new Error("No user ID in state");
      }

      // Store tokens in database
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const { error: dbError } = await supabase
        .from("outlook_calendar_tokens")
        .upsert(
          {
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to store tokens");
      }

      // Get user's email from Microsoft Graph
      let outlookEmail = "";
      try {
        const userInfoRes = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          outlookEmail = userInfo.mail || userInfo.userPrincipalName || "";
        }
      } catch { /* ignore */ }

      const successParams = `outlook_auth=success&outlook_email=${encodeURIComponent(outlookEmail)}`;

      if (redirectScheme) {
        const returnUrl = `${redirectScheme}://settings?${successParams}`;
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connected!</title>
  <script>window.location.replace('${returnUrl}');</script>
</head>
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:3rem 1.5rem;background:#fff">
  <p style="font-size:3rem;margin:0">&#10003;</p>
  <h2 style="margin:0.5rem 0">Outlook Calendar connected!</h2>
  <p style="color:#555;margin:0.5rem 0 1.5rem">Returning to the app&hellip;</p>
  <a href="${returnUrl}" style="display:inline-block;padding:0.75rem 2rem;background:#0078d4;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:1rem">Open App</a>
</body>
</html>`;
        return new Response(html, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      // Web: redirect to settings page
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${Deno.env.get("APP_URL") || "http://localhost:8080"}/settings?${successParams}`,
        },
      });
    }

    // All other routes require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Handle OAuth initiation — returns the Microsoft auth URL to the client
    if (path === "outlook-calendar-auth" || path === "initiate") {
      const body = await req.json().catch(() => ({}));
      const redirectSchemeFromClient = body.redirectScheme ?? null;

      const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      authUrl.searchParams.set("client_id", clientId!);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "Calendars.Read offline_access openid profile email");
      authUrl.searchParams.set("response_mode", "query");
      authUrl.searchParams.set(
        "state",
        JSON.stringify({ userId: user.id, redirectScheme: redirectSchemeFromClient })
      );

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token + fetch events
    if (path === "events" && req.method === "GET") {
      const { data: tokenData, error: tokenError } = await supabase
        .from("outlook_calendar_tokens")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: "Not authenticated with Outlook Calendar" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let accessToken = tokenData.access_token;

      // Refresh if expired
      if (new Date(tokenData.expires_at) < new Date()) {
        const refreshResponse = await fetch(
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              refresh_token: tokenData.refresh_token,
              client_id: clientId!,
              client_secret: clientSecret!,
              grant_type: "refresh_token",
              scope: "Calendars.Read offline_access",
            }),
          }
        );

        const newTokens = await refreshResponse.json();

        if (refreshResponse.ok) {
          accessToken = newTokens.access_token;
          const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

          await supabase
            .from("outlook_calendar_tokens")
            .update({
              access_token: accessToken,
              expires_at: newExpiresAt.toISOString(),
            })
            .eq("user_id", user.id);
        }
      }

      // Fetch primary calendar events from Microsoft Graph
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const calendarResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarView?` +
          `startDateTime=${encodeURIComponent(timeMin)}&` +
          `endDateTime=${encodeURIComponent(timeMax)}&` +
          `$select=id,subject,start,end,bodyPreview,webLink&` +
          `$orderby=start/dateTime&` +
          `$top=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'outlook.timezone="UTC"',
          },
        }
      );

      if (!calendarResponse.ok) {
        const errBody = await calendarResponse.text();
        console.error("Graph API error:", calendarResponse.status, errBody);
        throw new Error(`Microsoft Graph API error (${calendarResponse.status})`);
      }

      const data = await calendarResponse.json();

      return new Response(JSON.stringify({ events: data.value || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    const reqUrl = new URL(req.url);
    if (req.method === "GET" && reqUrl.searchParams.has("code")) {
      const state = reqUrl.searchParams.get("state") ?? "";
      let redirectScheme: string | null = null;
      try { redirectScheme = JSON.parse(state).redirectScheme ?? null; } catch { /* ignore */ }
      const returnUrl = redirectScheme ? `${redirectScheme}://` : null;

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connection Failed</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f2f2f7; }
    .card { background: white; border-radius: 16px; padding: 40px 28px; text-align: center; max-width: 320px; width: 90%; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p { color: #6e6e73; margin-bottom: 24px; }
    .btn { display: inline-block; background: #0078d4; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:52px">❌</div>
    <h1>Connection Failed</h1>
    <p>Could not connect Outlook Calendar. Please try again.</p>
    ${returnUrl ? `<a href="${returnUrl}" class="btn">Return to Co-Captain</a>` : ""}
  </div>
</body>
</html>`;
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
