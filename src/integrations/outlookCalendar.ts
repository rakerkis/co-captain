// Outlook Calendar — client-side PKCE OAuth
// No Supabase session required. Tokens stored in secureStorage (like Canvas).
// Microsoft Graph API called directly from the client.
// Works on web and native (Capacitor) without any Co-Captain account.

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { secureStorage } from "@/integrations/secureStorage";

const CLIENT_ID = "495ad01e-4170-4a6d-aaaf-86de3240b8e8";
const SCOPES = "Calendars.Read offline_access openid profile email";
const STORAGE_KEY = "outlook-calendar-tokens";
const VERIFIER_KEY = "outlook-pkce-verifier";

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  webLink?: string;
}

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO string
  email?: string;
}

// PKCE helpers
function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64urlEncode(arr.buffer);
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(digest);
}

function getRedirectUri(): string {
  if (Capacitor.isNativePlatform()) {
    return "co-captain://outlook-auth";
  }
  // Web: use the current origin — must be registered in Azure
  return window.location.origin;
}

class OutlookCalendarService {
  async isAuthenticated(): Promise<boolean> {
    const raw = await secureStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const tokens: StoredTokens = JSON.parse(raw);
      return !!tokens.access_token;
    } catch {
      return false;
    }
  }

  async getEmail(): Promise<string> {
    const raw = await secureStorage.getItem(STORAGE_KEY);
    if (!raw) return "";
    try {
      const tokens: StoredTokens = JSON.parse(raw);
      return tokens.email || "";
    } catch {
      return "";
    }
  }

  // Step 1: build the auth URL and open the Microsoft consent page
  async connect(): Promise<"redirecting"> {
    const verifier = generateVerifier();
    const challenge = await generateChallenge(verifier);

    // Persist verifier so we can use it in the code exchange callback
    await secureStorage.setItem(VERIFIER_KEY, verifier);

    const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", getRedirectUri());
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    console.log("[Outlook] redirect URI:", getRedirectUri());
    console.log("[Outlook] auth URL:", authUrl.toString().substring(0, 100) + "...");

    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: authUrl.toString() });
    } else {
      window.location.href = authUrl.toString();
    }

    return "redirecting";
  }

  // Step 2: exchange the authorization code for tokens (called from App.tsx / Settings.tsx)
  async handleCallback(code: string): Promise<string> {
    const verifier = await secureStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error("PKCE verifier missing — please try connecting again.");

    console.log("[Outlook] handleCallback redirect_uri:", getRedirectUri());
    console.log("[Outlook] verifier present:", !!verifier, "length:", verifier?.length);
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier,
      scope: SCOPES,
    });

    const resp = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }
    );

    const tokens = await resp.json();
    console.log("[Outlook] token exchange status:", resp.status);
    if (!resp.ok) {
      throw new Error(tokens.error_description || tokens.error || "Failed to exchange Outlook token");
    }

    // Extract email from id_token JWT payload (no extra API call needed)
    let email = "";
    try {
      if (tokens.id_token) {
        const payload = JSON.parse(atob(tokens.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        email = payload.email || payload.preferred_username || "";
      }
    } catch { /* ignore */ }
    console.log("[Outlook] connected email:", email);

    const stored: StoredTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      email,
    };
    await secureStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    await secureStorage.removeItem(VERIFIER_KEY);

    return email;
  }

  async disconnect(): Promise<void> {
    await secureStorage.removeItem(STORAGE_KEY);
    await secureStorage.removeItem(VERIFIER_KEY);
    window.localStorage.removeItem("outlook-connected-email");
  }

  private async getValidAccessToken(): Promise<string> {
    const raw = await secureStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("Not connected to Outlook Calendar. Please connect in Settings.");

    const tokens: StoredTokens = JSON.parse(raw);

    // Refresh if expired
    if (new Date(tokens.expires_at) < new Date()) {
      const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        scope: SCOPES,
      });

      const resp = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        }
      );

      const newTokens = await resp.json();
      if (!resp.ok) throw new Error("Outlook token refresh failed. Please reconnect in Settings.");

      const updated: StoredTokens = {
        ...tokens,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokens.refresh_token,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      };
      await secureStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated.access_token;
    }

    return tokens.access_token;
  }

  async getEvents(): Promise<OutlookCalendarEvent[]> {
    const accessToken = await this.getValidAccessToken();

    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const resp = await fetch(
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

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Microsoft Graph API error (${resp.status}): ${err}`);
    }

    const data = await resp.json();
    return data.value || [];
  }
}

export const outlookCalendar = new OutlookCalendarService();
export default outlookCalendar;
