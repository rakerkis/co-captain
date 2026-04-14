// Google Calendar API Service
// Reads/writes tokens directly via Supabase DB (PostgREST) to bypass the Edge
// Function relay's JWT validation issues.  Only the initial OAuth handshake
// still uses the Edge Function.

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";

const NATIVE_SCHEME = "co-captain";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  colorId?: string;
}

class GoogleCalendarService {
  // Check if the user has Google Calendar tokens stored in the database
  // Reads directly from the google_calendar_tokens table (bypasses Edge Function)
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;

      const { data, error } = await supabase
        .from("google_calendar_tokens")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      return !!data && !error;
    } catch {
      return false;
    }
  }

  // Tiny persistent debug logger (mirrors authLog in App.tsx)
  private log(msg: string) {
    try {
      const key = "co-captain-auth-log";
      const entries: string[] = JSON.parse(window.localStorage.getItem(key) || "[]");
      const t = new Date().toLocaleTimeString("en", { hour12: false });
      entries.unshift(`${t} ${msg}`);
      window.localStorage.setItem(key, JSON.stringify(entries.slice(0, 25)));
    } catch { /* never crash on debug logging */ }
  }

  // Returns 'redirecting' when OAuth was launched in external Safari (native, no session).
  // The caller should not check auth status in that case — appUrlOpen in App.tsx handles it.
  async connect(): Promise<"done" | "redirecting"> {
    const isNative = Capacitor.isNativePlatform();

    // Helper to start a fresh Google sign-in (used on any auth failure path)
    const startFreshOAuth = async (): Promise<"done" | "redirecting"> => {
      this.log("connect: startFreshOAuth");
      await supabase.auth.signOut();
      const { data: oauthData, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: isNative ? `${NATIVE_SCHEME}://` : window.location.origin,
          scopes: "https://www.googleapis.com/auth/calendar.readonly",
          queryParams: { access_type: "offline", prompt: "consent" },
          skipBrowserRedirect: isNative,
        },
      });
      if (oauthErr) throw oauthErr;
      if (isNative && oauthData.url) {
        // Navigate the webview to the OAuth URL. Capacitor 8's WKWebView delegation
        // handler (WebViewDelegationHandler.swift) automatically intercepts top-level
        // navigations to external URLs and opens them via UIApplication.shared.open(),
        // which opens native Safari. The webview stays on the current page.
        //
        // This is critical: Browser.open() / SFSafariViewController silently drops
        // server-side 302 redirects to custom URL schemes on iOS 14+ (security change),
        // so the Supabase callback redirect to co-captain:// would never reach the app.
        // Native Safari handles the redirect properly and fires appUrlOpen in App.tsx.
        window.location.href = oauthData.url;
        return "redirecting";
      }
      return "done";
    };

    // Use getUser() — validates the token server-side (unlike getSession() which reads cache).
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    this.log(`connect: getUser → ${user ? "ok uid=" + user.id.substring(0, 8) : "FAIL err=" + userError?.message}`);

    if (!user || userError) {
      return startFreshOAuth();
    }

    // Explicitly refresh the session to get a guaranteed-fresh access token.
    const { data: freshData, error: freshErr } = await supabase.auth.refreshSession();
    const freshToken = freshData?.session?.access_token;
    this.log(`connect: refreshSession → ${freshErr ? "FAIL " + freshErr.message : "ok len=" + (freshToken?.length ?? 0)}`);

    if (freshErr || !freshToken) {
      return startFreshOAuth();
    }

    // Use raw fetch() instead of supabase.functions.invoke() to have complete control
    // over headers. functions.invoke() merges its own base Authorization header
    // (Bearer <anon_key>) and the merge order can cause the wrong token to be sent.
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    this.log(`connect: calling Edge Function token[0:20]=${freshToken.substring(0, 20)}`);

    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${freshToken}`,
      },
      body: JSON.stringify(isNative ? { redirectScheme: NATIVE_SCHEME } : {}),
    });

    const responseText = await resp.text();
    this.log(`connect: EF status=${resp.status} body=${responseText.substring(0, 80)}`);

    if (resp.status === 401) {
      // The Supabase Edge Function relay rejected the JWT despite getUser() and
      // refreshSession() succeeding. This happens when the simulator has leftover
      // localStorage from a previous Xcode run with a corrupted session.
      // Fall back to a completely fresh sign-in instead of erroring out.
      this.log("connect: 401 from relay — falling back to fresh OAuth");
      return startFreshOAuth();
    }

    if (!resp.ok) {
      throw new Error(`Edge Function error: ${responseText}`);
    }

    let data: any;
    try { data = JSON.parse(responseText); } catch {
      throw new Error(`Edge Function bad JSON: ${responseText}`);
    }

    if (!data?.authUrl)
      throw new Error(`No authUrl in response: ${JSON.stringify(data)}`);

    if (isNative) {
      await Browser.open({ url: data.authUrl });
      // The browser will redirect back to co-captain://settings?google_auth=success
      // which fires appUrlOpen in App.tsx.
      return "redirecting";
    } else {
      window.location.href = data.authUrl;
    }
    return "done";
  }

  // Disconnect — remove tokens directly from database (bypasses Edge Function)
  async disconnect(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await supabase
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", session.user.id);

    if (error) {
      throw new Error(`Disconnect failed: ${error.message}`);
    }
  }

  // Store Google tokens directly in the database (bypasses Edge Function relay).
  // Called from App.tsx after PKCE exchange to persist provider tokens.
  async storeTokens(accessToken: string, refreshToken: string | null): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      this.log("storeTokens: no session/user");
      return;
    }

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // Google tokens expire in 1h

    const { error } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: session.user.id,
        access_token: accessToken,
        refresh_token: refreshToken || null,
        expires_at: expiresAt,
      }, { onConflict: "user_id" });

    this.log(`storeTokens: ${error ? "ERROR " + error.message : "ok"}`);
    if (error) {
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  // Fetch calendar events — reads tokens from DB, calls Google Calendar API directly.
  // If the Google access token is expired, attempts refresh via Edge Function (fallback).
  async getEvents(
    timeMin?: string,
    timeMax?: string,
  ): Promise<GoogleCalendarEvent[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error("Not signed in");
    }

    // Read Google tokens directly from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (tokenError || !tokenData) {
      throw new Error("Not connected to Google Calendar. Please connect in Settings.");
    }

    let accessToken = tokenData.access_token;

    // Check if Google access token is expired → try refresh
    if (new Date(tokenData.expires_at) < new Date()) {
      this.log(`getEvents: Google token expired (expires_at=${tokenData.expires_at}), refresh_token=${tokenData.refresh_token ? "present" : "NULL"}`);
      try {
        accessToken = await this.refreshGoogleToken(session.user.id, tokenData.refresh_token);
      } catch (refreshErr) {
        const msg = refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
        this.log(`getEvents: refresh failed — ${msg}`);
        // Auto-disconnect so the user sees a clean "Connect" button in Settings
        // instead of appearing connected but broken.
        try {
          await this.disconnect();
          this.log("getEvents: auto-disconnected after refresh failure");
        } catch { /* ignore disconnect errors */ }
        throw new Error("Google Calendar disconnected — token expired. Please reconnect in Settings.");
      }
    }

    // Call Google Calendar API directly (bypasses Edge Function relay entirely)
    const tMin = timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const tMax = timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

    this.log(`getEvents: calling Google API timeMin=${tMin.substring(0, 10)}`);

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(tMin)}&` +
      `timeMax=${encodeURIComponent(tMax)}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
      },
    );

    if (!calendarResponse.ok) {
      const errBody = await calendarResponse.text();
      this.log(`getEvents: Google API ${calendarResponse.status}: ${errBody.substring(0, 120)}`);
      throw new Error(`Google Calendar API error (${calendarResponse.status})`);
    }

    const data = await calendarResponse.json();
    this.log(`getEvents: got ${data.items?.length ?? 0} events`);
    return data.items || [];
  }

  // Helper: refresh an expired Google access token using the refresh_token.
  // Calls Google's token endpoint directly via a Supabase Edge Function proxy
  // (since the client_secret is required and must stay server-side).
  // Falls back to reading the refresh_token from DB and calling a dedicated
  // refresh endpoint.
  private async refreshGoogleToken(userId: string, refreshToken: string): Promise<string> {
    if (!refreshToken) {
      throw new Error("No refresh token available — please reconnect");
    }

    // Call the Edge Function's /refresh endpoint (doesn't need user JWT —
    // we pass the refresh_token directly and the EF uses the service role).
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth/refresh`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ user_id: userId, refresh_token: refreshToken }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      this.log(`refreshGoogleToken: EF /refresh failed (${resp.status}): ${errBody.substring(0, 80)}`);
      throw new Error(`Token refresh failed (${resp.status})`);
    }

    const data = await resp.json();
    if (!data.access_token) {
      throw new Error("No access_token in refresh response");
    }

    // Update the DB with the new access token (and rotated refresh token if provided)
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
    const updatePayload: Record<string, string> = { access_token: data.access_token, expires_at: expiresAt };
    if (data.refresh_token_rotated) {
      this.log("refreshGoogleToken: Google rotated the refresh token");
    }
    await supabase
      .from("google_calendar_tokens")
      .update(updatePayload)
      .eq("user_id", userId);

    this.log(`refreshGoogleToken: success, new token len=${data.access_token.length}`);
    return data.access_token;
  }
}

export const googleCalendar = new GoogleCalendarService();
export default googleCalendar;
