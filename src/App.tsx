import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, focusManager } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { googleCalendar } from "@/integrations/googleCalendar";
import { outlookCalendar } from "@/integrations/outlookCalendar";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import Sidebar from "./components/Sidebar";
import MobileTabBar from "./components/MobileTabBar";
import { AuthForm } from "./components/AuthForm";
import { usePlatform } from "./hooks/use-platform";
import Index from "./pages/Index";
import Assignments from "./pages/Assignments";
import GPA from "./pages/GPA";
import Courses from "./pages/Courses";
import Focus from "./pages/Focus";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { toast } from "@/hooks/use-toast";

// Query keys that represent "sync" operations — we batch their results into
// a single toast so the user sees one notification per sync cycle.
const SYNC_QUERY_KEYS = [
  "canvas-assignments",
  "canvas-courses",
  "canvas-calendar-events",
  "google-calendar-events",
  "custom-assignments",
];

let syncBatchTimer: ReturnType<typeof setTimeout> | null = null;
let syncBatchErrors: string[] = [];
let syncBatchSuccessCount = 0;

function flushSyncBatch() {
  const errors = syncBatchErrors;
  const successes = syncBatchSuccessCount;
  syncBatchErrors = [];
  syncBatchSuccessCount = 0;
  syncBatchTimer = null;

  if (errors.length > 0) {
    toast({
      title: "Sync Failed",
      description: errors.length === 1
        ? errors[0]
        : `${errors.length} sources failed to sync.`,
      variant: "destructive",
    });
  } else if (successes > 0) {
    toast({
      title: "Sync Complete",
      description: "All data synced successfully.",
    });
  }
}

function scheduleSyncToast() {
  if (syncBatchTimer) clearTimeout(syncBatchTimer);
  syncBatchTimer = setTimeout(flushSyncBatch, 500);
}

const queryCache = new QueryCache({
  onError: (error, query) => {
    const key = query.queryKey[0] as string;
    if (!SYNC_QUERY_KEYS.includes(key)) return;
    const label = key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    syncBatchErrors.push(`${label}: ${error.message || "unknown error"}`);
    scheduleSyncToast();
  },
  onSuccess: (_data, query) => {
    const key = query.queryKey[0] as string;
    if (!SYNC_QUERY_KEYS.includes(key)) return;
    syncBatchSuccessCount++;
    scheduleSyncToast();
  },
});

const queryClient = new QueryClient({ queryCache });

// Pause all React Query refetching when the app is in the background.
// This prevents network requests (sync, data fetches) from firing while
// the app is not visible, regardless of the auto-sync setting.
if (Capacitor.isNativePlatform()) {
  CapApp.addListener("appStateChange", ({ isActive }) => {
    focusManager.setFocused(isActive ? true : false);
  });
}

// Persistent auth debug log — written throughout the OAuth flow so we can
// see exactly what happened even after the app returns to foreground.
function authLog(msg: string) {
  try {
    const key = "co-captain-auth-log";
    const entries: string[] = JSON.parse(window.localStorage.getItem(key) || "[]");
    const t = new Date().toLocaleTimeString("en", { hour12: false });
    entries.unshift(`${t} ${msg}`);
    window.localStorage.setItem(key, JSON.stringify(entries.slice(0, 25)));
  } catch { /* never crash on debug logging */ }
}

const AppLayout = ({ session }: { session: any }) => {
  const { isNative } = usePlatform();
  const navigate = useNavigate();

  // Web: handle Outlook PKCE callback when Microsoft redirects back with ?code=
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    const verifier = window.localStorage.getItem("outlook-pkce-verifier");
    if (!verifier) return; // not an Outlook callback — let Supabase handle it
    (async () => {
      try {
        authLog(`outlook web PKCE exchange start`);
        const email = await outlookCalendar.handleCallback(code);
        authLog(`outlook web exchange ok email=${email}`);
        if (email) window.localStorage.setItem("outlook-connected-email", email);
        window.dispatchEvent(new CustomEvent("co-captain:outlook-auth-done", { detail: { email } }));
        navigate(`/settings?outlook_auth=success&outlook_email=${encodeURIComponent(email)}`, { replace: true });
      } catch (e: any) {
        authLog(`outlook web exchange error: ${e.message}`);
        navigate("/settings?outlook_auth=error", { replace: true });
      }
    })();
  }, [navigate]);

  // Handle deep link callbacks on native (OAuth redirects back via custom URL scheme)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener("appUrlOpen", async ({ url }) => {
      console.log("=== appUrlOpen fired ===");
      console.log("Raw URL:", url);
      authLog(`appUrlOpen: ${url.substring(0, 80)}`);

      // Support both the old and new custom schemes, with or without //
      if (
        !url.startsWith("co-captain:") &&
        !url.startsWith("com.co-captain.app:")
      ) {
        console.log("URL scheme not matched, ignoring");
        authLog(`IGNORED — scheme not matched`);
        return;
      }

      // Close the in-app browser first
      await Browser.close().catch(() => {});

      // Parse query params from the custom scheme URL safely
      let params = new URLSearchParams();
      try {
        const parsedUrl = new URL(url);
        const searchParams = new URLSearchParams(parsedUrl.search);
        const hashParams = new URLSearchParams(
          parsedUrl.hash.replace(/^#/, ""),
        );
        searchParams.forEach((value, key) => params.set(key, value));
        hashParams.forEach((value, key) => params.set(key, value));
        console.log("URL parsed via new URL()");
      } catch (e) {
        console.log("new URL() failed, using manual parse. Error:", String(e));
        const queryString = url.includes("?")
          ? url.split("?")[1].split("#")[0]
          : "";
        const hashString = url.includes("#") ? url.split("#")[1] : "";
        const searchParams = new URLSearchParams(queryString);
        const hashParams = new URLSearchParams(hashString);
        searchParams.forEach((value, key) => params.set(key, value));
        hashParams.forEach((value, key) => params.set(key, value));
      }

      console.log("All parsed params:");
      params.forEach((value, key) => {
        const display = key.toLowerCase().includes("token") || key === "code"
          ? `${value.substring(0, 20)}... (length ${value.length})`
          : value;
        console.log(`  ${key} = ${display}`);
      });
      authLog(`params: ${Array.from(params.keys()).join(", ") || "(none)"}`);

      // Outlook Calendar PKCE callback (native)
      if (url.startsWith("co-captain://outlook-auth") || params.get("outlook_auth") === "success") {
        const code = params.get("code");
        if (code) {
          authLog(`outlook PKCE code received, exchanging...`);
          try {
            const email = await outlookCalendar.handleCallback(code);
            authLog(`outlook exchange ok email=${email}`);
            if (email) window.localStorage.setItem("outlook-connected-email", email);
            window.dispatchEvent(new CustomEvent("co-captain:outlook-auth-done", { detail: { email } }));
            navigate(`/settings?outlook_auth=success&outlook_email=${encodeURIComponent(email)}`);
          } catch (e: any) {
            authLog(`outlook exchange error: ${e.message}`);
            navigate("/settings?outlook_auth=error");
          }
        } else {
          const email = params.get("outlook_email") || "";
          if (email) window.localStorage.setItem("outlook-connected-email", email);
          window.dispatchEvent(new CustomEvent("co-captain:outlook-auth-done", { detail: { email } }));
          navigate(`/settings?outlook_auth=success&outlook_email=${encodeURIComponent(email)}`);
        }
        return;
      }

      // Google Calendar OAuth success
      if (params.get("google_auth") === "success") {
        const email = params.get("google_email") || "";
        console.log("→ google_auth=success, email:", email);
        authLog(`google_auth=success email=${email || "(empty)"}`);
        if (email) window.localStorage.setItem("google-connected-email", email);
        window.dispatchEvent(new CustomEvent("co-captain:google-auth-done", { detail: { email } }));
        navigate(
          `/settings?google_auth=success&google_email=${encodeURIComponent(email)}`,
        );
        return;
      }

      // Supabase PKCE auth code
      const code = params.get("code");
      if (code) {
        console.log("→ PKCE code received, exchanging... code length:", code.length);
        authLog(`PKCE exchange start (code len=${code.length})`);
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        console.log(
          "exchangeCodeForSession result:",
          exchangeError ? `ERROR: ${exchangeError.message}` : "success",
        );
        authLog(`exchange result: ${exchangeError ? "ERROR: " + exchangeError.message : "ok, user=" + (data?.session?.user?.email || "?")}`);
        console.log("Session user:", data?.session?.user?.id, data?.session?.user?.email);
        console.log("Access token length:", data?.session?.access_token?.length);
        const providerToken = data?.session?.provider_token;
        const providerRefreshToken = data?.session?.provider_refresh_token;
        console.log("provider_token:", providerToken ? `present (len ${providerToken.length})` : "NULL — calendar will NOT auto-connect");
        authLog(`provider_token: ${providerToken ? "PRESENT len=" + providerToken.length : "NULL"}`);
        console.log("provider_refresh_token:", providerRefreshToken ? "present" : "null");
        if (providerToken) {
          console.log("Storing provider tokens in DB...");
          authLog(`storing provider tokens...`);
          // Store directly in the database via Supabase client (PostgREST).
          // This bypasses the Edge Function relay which rejects user JWTs.
          try {
            await googleCalendar.storeTokens(providerToken, providerRefreshToken || null);
            console.log("Store result: ok (direct DB)");
            authLog(`store result: ok (direct DB)`);
          } catch (e: any) {
            console.error("Failed to store provider token:", e);
            authLog(`store result: ERROR ${e.message}`);
          }
        }
        console.log("Navigating to /settings?google_auth=success");
        const pkceEmail = data?.session?.user?.email || window.localStorage.getItem("google-connected-email") || "";
        if (pkceEmail) window.localStorage.setItem("google-connected-email", pkceEmail);
        authLog(`dispatching event email=${pkceEmail || "(empty)"}`);
        window.dispatchEvent(new CustomEvent("co-captain:google-auth-done", { detail: { email: pkceEmail } }));
        navigate("/settings?google_auth=success", { replace: true });
        return;
      }

      // Supabase Implicit Auth (e.g. #access_token=...)
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken) {
        console.log("→ Implicit flow — access_token: present, refresh_token:", refreshToken ? "present" : "null");
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });
        console.log(
          "setSession result:",
          sessionError ? `error: ${sessionError.message}` : "success",
        );
        console.log("Session user after setSession:", data?.session?.user?.email);

        const providerToken =
          params.get("provider_token") || data?.session?.provider_token;
        const providerRefreshToken =
          params.get("provider_refresh_token") ||
          data?.session?.provider_refresh_token;
        console.log("provider_token:", providerToken ? `present (len ${providerToken.length})` : "NULL — calendar will NOT auto-connect");
        if (providerToken) {
          console.log("Storing provider tokens in DB (implicit)...");
          try {
            await googleCalendar.storeTokens(providerToken, providerRefreshToken || null);
          } catch (e) {
            console.error("Failed to store provider token:", e);
          }
        }

        console.log("Navigating to /settings?google_auth=success");
        const implicitEmail = data?.session?.user?.email || window.localStorage.getItem("google-connected-email") || "";
        if (implicitEmail) window.localStorage.setItem("google-connected-email", implicitEmail);
        window.dispatchEvent(new CustomEvent("co-captain:google-auth-done", { detail: { email: implicitEmail } }));
        navigate("/settings?google_auth=success", { replace: true });
        return;
      }

      console.log("WARNING: No recognized params found in URL. Nothing handled.");
      authLog(`WARNING: no recognized params in URL`);
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [navigate]);

  const routes = (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/assignments" element={<Assignments />} />
      <Route path="/gpa" element={<GPA />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/focus" element={<Focus />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/auth" element={<AuthForm />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  if (isNative) {
    return (
      <div
        className="flex flex-col w-full min-h-screen"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "calc(49px + env(safe-area-inset-bottom))" }}
        >
          {routes}
        </main>
        <MobileTabBar />
      </div>
    );
  }

  // Web layout — sidebar unchanged
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar session={session} />
      <main className="flex-1">{routes}</main>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // When the user completes Google OAuth on native, the WKWebView lands on
      // capacitor://localhost?code=xxx and Supabase auto-exchanges the code.
      // The resulting session includes provider_token — store it so Google Calendar
      // is connected automatically without a second OAuth step.
      // Only auto-store provider tokens if the user hasn't explicitly disconnected
      const wasDisconnected = window.localStorage.getItem("google-calendar-disconnected") === "true";
      if (session?.provider_token && Capacitor.isNativePlatform() && !wasDisconnected) {
        supabase.functions
          .invoke("google-calendar-auth/store", {
            body: {
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token ?? null,
            },
          })
          .catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout session={session} />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
