import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Settings, ExternalLink, Globe, RefreshCw, CheckCircle, XCircle, ScanLine, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { APP_VERSION } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { secureStorage } from "@/integrations/secureStorage";
import { supabase } from "@/integrations/supabase/client";
import { googleCalendar } from "@/integrations/googleCalendar";
import { testCanvasConnection } from "@/integrations/canvasApi";
import { outlookCalendar } from "@/integrations/outlookCalendar";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from "@capacitor/barcode-scanner";

interface SettingsData {
  canvasDomain: string;
  canvasToken: string;
  googleConnected: boolean;
  googleEmail?: string;
  outlookConnected: boolean;
  outlookEmail?: string;
  autoSync: boolean;
  syncInterval: number;
}

const SettingsPage = () => {
  const { toast } = useToast();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    canvasDomain: "canvas.instructure.com",
    canvasToken: "",
    googleConnected: false,
    googleEmail: "",
    outlookConnected: false,
    outlookEmail: "",
    autoSync: true,
    syncInterval: 15,
  });

  const [googleStatus, setGoogleStatus] = useState<string | null>(null);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const [tokenIsNew, setTokenIsNew] = useState(false);
  const [maskedToken, setMaskedToken] = useState("");
  const [canvasTesting, setCanvasTesting] = useState(false);
  const [canvasTestResult, setCanvasTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Run once on mount: load persisted settings, then check live auth status.
  // checkStatus runs AFTER settings load so auth state always wins over stale persisted values.
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Skip auto-reconnect if the user explicitly disconnected Google Calendar
        const wasDisconnected = window.localStorage.getItem("google-calendar-disconnected") === "true";

        if (!wasDisconnected) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.provider_token && session?.user?.app_metadata?.provider === 'google') {
            const email = session.user?.email || "";
            if (email) window.localStorage.setItem("google-connected-email", email);
            setSettings((prev) => ({ ...prev, googleConnected: true, googleEmail: email }));
            setGoogleStatus("Connected successfully!");
          } else {
            const isConnected = await googleCalendar.isAuthenticated();
            if (isConnected) {
              const savedEmail = window.localStorage.getItem("google-connected-email") || "";
              setSettings((prev) => ({ ...prev, googleConnected: true, googleEmail: savedEmail }));
            }
          }
        }

        const outlookConnected = await outlookCalendar.isAuthenticated();
        if (outlookConnected) {
          const email = await outlookCalendar.getEmail();
          setSettings((prev) => ({ ...prev, outlookConnected: true, outlookEmail: email }));
        }
      } catch {
        // Not connected or not signed in
      }
    };

    secureStorage.getItem("co-captain-settings").then(async (savedSettings) => {
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.canvasToken) {
            const token = parsed.canvasToken;
            setMaskedToken(token.slice(0, 6) + "••••••••••");
            setSettings((prev) => ({ ...prev, ...parsed, canvasToken: "" }));
          } else {
            setSettings((prev) => ({ ...prev, ...parsed }));
          }
        } catch (e) {
          console.error("Failed to parse settings:", e);
        }
      }
      // Always run after settings load so auth state wins
      await checkStatus();
    });
  }, []);

  // Re-runs whenever the URL changes — handles the OAuth callback that
  // appUrlOpen delivers via navigate('/settings?google_auth=success&...')
  // while this component is already mounted.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleAuth = params.get("google_auth");
    const googleEmail = params.get("google_email");

    if (googleAuth === "success") {
      const email = googleEmail || "";
      if (email) window.localStorage.setItem("google-connected-email", email);
      window.localStorage.removeItem("google-calendar-disconnected");
      setSettings((prev) => ({
        ...prev,
        googleConnected: true,
        googleEmail: email || window.localStorage.getItem("google-connected-email") || "",
      }));
      setGoogleError(null);
      setGoogleStatus("Connected successfully!");
      toast({ title: "Google Connected", description: `Connected as ${email}` });
      window.history.replaceState(null, "", window.location.pathname);
    }

    const outlookAuth = params.get("outlook_auth");
    const outlookEmail = params.get("outlook_email");
    if (outlookAuth === "success") {
      const email = outlookEmail || "";
      if (email) window.localStorage.setItem("outlook-connected-email", email);
      setSettings((prev) => ({
        ...prev,
        outlookConnected: true,
        outlookEmail: email || window.localStorage.getItem("outlook-connected-email") || "",
      }));
      setOutlookError(null);
      setOutlookLoading(false);
      toast({ title: "Outlook Connected", description: `Connected as ${email}` });
      window.history.replaceState(null, "", window.location.pathname);
    } else if (outlookAuth === "error") {
      setOutlookError("Failed to connect to Outlook. Please try again.");
      setOutlookLoading(false);
      toast({
        title: "Outlook Connection Failed",
        description: "Failed to exchange token with Microsoft. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [location.search, toast]);

  // Primary signal: appUrlOpen in App.tsx dispatches this event immediately after
  // the code exchange completes. This is independent of React Router, navigate(),
  // and provider_token availability — it fires in all three auth paths.
  useEffect(() => {
    const refreshDebugLog = () => {
      try {
        const raw = window.localStorage.getItem("co-captain-auth-log");
        setDebugLog(raw ? JSON.parse(raw) : []);
      } catch { /* ignore */ }
    };

    const handler = (e: Event) => {
      const email = (e as CustomEvent<{ email: string }>).detail?.email || window.localStorage.getItem("google-connected-email") || "";
      if (email) window.localStorage.setItem("google-connected-email", email);
      setSettings((prev) => ({ ...prev, googleConnected: true, googleEmail: email }));
      setGoogleError(null);
      setGoogleStatus("Connected successfully!");
      setGoogleLoading(false);
      toast({ title: "Google Connected", description: `Connected as ${email || "your Google account"}` });
      refreshDebugLog();
    };
    window.addEventListener("co-captain:google-auth-done", handler);

    const outlookHandler = (e: Event) => {
      const email = (e as CustomEvent<{ email: string }>).detail?.email || window.localStorage.getItem("outlook-connected-email") || "";
      if (email) window.localStorage.setItem("outlook-connected-email", email);
      setSettings((prev) => ({ ...prev, outlookConnected: true, outlookEmail: email }));
      setOutlookError(null);
      setOutlookLoading(false);
      toast({ title: "Outlook Connected", description: `Connected as ${email || "your Outlook account"}` });
    };
    window.addEventListener("co-captain:outlook-auth-done", outlookHandler);

    refreshDebugLog(); // load on mount
    return () => {
      window.removeEventListener("co-captain:google-auth-done", handler);
      window.removeEventListener("co-captain:outlook-auth-done", outlookHandler);
    };
  }, [toast]);

  // Fallback: when the app returns to foreground, wait 3 s to let appUrlOpen's
  // async code exchange finish, then re-check the DB. Covers slow exchanges
  // and the Edge Function calendar OAuth path (tokens stored server-side).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const listenerPromise = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const connected = await googleCalendar.isAuthenticated();
          if (connected) {
            const email = window.localStorage.getItem("google-connected-email") || "";
            setSettings((prev) => {
              if (prev.googleConnected) return prev; // already updated by custom event
              return { ...prev, googleConnected: true, googleEmail: email };
            });
          }
        } catch { /* ignore — user might not be signed in yet */ }
      }, 3000);
    });
    return () => {
      clearTimeout(timeoutId);
      listenerPromise.then((l) => l.remove());
    };
  }, []);

  const handleScanToken = async () => {
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: "Point at your Canvas token QR code",
      });
      if (result.ScanResult) {
        setSettings((prev) => ({ ...prev, canvasToken: result.ScanResult }));
        setTokenIsNew(true);
        setMaskedToken("");
        toast({ title: "Token Scanned", description: "Canvas API token has been filled in." });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("canceled") || msg.includes("cancelled")) return;
      toast({
        title: "Scan Failed",
        description: msg || "Could not scan QR code.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save the full token to secure storage (Keychain on native, localStorage on web)
      await secureStorage.setItem("co-captain-settings", JSON.stringify(settings));

      // After saving, mask the token so it can't be seen again
      if (settings.canvasToken) {
        setMaskedToken(settings.canvasToken.slice(0, 6) + "••••••••••");
        setSettings((prev) => ({ ...prev, canvasToken: "" }));
        setTokenIsNew(false);
      }

      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestCanvas = async () => {
    setCanvasTesting(true);
    setCanvasTestResult(null);
    try {
      // Read saved settings from secure storage (the token is masked in state)
      const saved = await secureStorage.getItem("co-captain-settings");
      if (!saved) {
        setCanvasTestResult({ ok: false, message: "No Canvas settings saved. Please save first." });
        return;
      }
      const parsed = JSON.parse(saved);
      if (!parsed.canvasDomain || !parsed.canvasToken) {
        setCanvasTestResult({ ok: false, message: "Canvas domain or token missing. Please save first." });
        return;
      }
      // Lightweight API call — only fetches courses to verify token works
      const result = await testCanvasConnection();
      setCanvasTestResult({ ok: true, message: `Connected! Found ${result.courseCount} course${result.courseCount !== 1 ? "s" : ""}.` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setCanvasTestResult({ ok: false, message: msg });
    } finally {
      setCanvasTesting(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (settings.googleConnected) {
      // Disconnect — remove tokens from DB
      try {
        await googleCalendar.disconnect();
      } catch (e) {
        console.error("Disconnect error:", e);
      }
      window.localStorage.removeItem("google-connected-email");
      window.localStorage.setItem("google-calendar-disconnected", "true");
        
        const newSettings = { ...settings, googleConnected: false, googleEmail: "" };
        setSettings(newSettings);
        secureStorage.setItem("co-captain-settings", JSON.stringify(newSettings)).catch(console.error);
        
      setGoogleError(null);
      setGoogleStatus(null);
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected.",
      });
      return;
    }

    setGoogleLoading(true);
    setGoogleError(null);
    window.localStorage.removeItem("google-calendar-disconnected");
    try {
      const result = await googleCalendar.connect();
      if (result === 'redirecting') {
        // In-app browser opened for OAuth. appUrlOpen in App.tsx handles the
        // URL callback and navigates here with ?google_auth=success. Also add a
        // browserFinished listener as a fallback for when the user manually
        // closes the browser (e.g. taps the "Done" button) after authorizing.
        if (Capacitor.isNativePlatform()) {
          const listener = await Browser.addListener('browserFinished', async () => {
            listener.remove();
            try {
              const connected = await googleCalendar.isAuthenticated();
              if (connected) {
                const email = window.localStorage.getItem("google-connected-email") || "";
                setSettings((prev) => ({ ...prev, googleConnected: true, googleEmail: email }));
                setGoogleStatus("Connected successfully!");
                toast({ title: "Google Connected", description: "Google Calendar is now connected." });
              }
            } catch { /* ignore — appUrlOpen path already handled it */ }
          });
        }
        return;
      }
      // Re-check auth status to see if the user successfully connected.
      const connected = await googleCalendar.isAuthenticated();
      if (connected) {
        const email = window.localStorage.getItem("google-connected-email") || "";
        
        const newSettings = { ...settings, googleConnected: true, googleEmail: email };
        setSettings(newSettings);
        secureStorage.setItem("co-captain-settings", JSON.stringify(newSettings)).catch(console.error);
        
        setGoogleStatus("Connected successfully!");
        toast({ title: "Google Connected", description: "Google Calendar is now connected." });
      } else {
        setGoogleError(`Could not verify connection. Please try again. [${APP_VERSION}]`);
      }
    } catch (error: any) {
      console.error("Google OAuth error:", error);
      setGoogleError(error.message || `Failed to connect to Google. Please try again. [${APP_VERSION}]`);
      toast({
        title: "Error",
        description: "Failed to connect to Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleConnectOutlook = async () => {
    if (settings.outlookConnected) {
      try {
        await outlookCalendar.disconnect();
      } catch (e) {
        console.error("Outlook disconnect error:", e);
      }
      window.localStorage.removeItem("outlook-connected-email");
      setSettings((prev) => ({ ...prev, outlookConnected: false, outlookEmail: "" }));
      setOutlookError(null);
      toast({ title: "Disconnected", description: "Outlook Calendar has been disconnected." });
      return;
    }

    setOutlookLoading(true);
    setOutlookError(null);
    console.log("[Outlook] connect() starting...");
    try {
      await outlookCalendar.connect();
      console.log("[Outlook] connect() called — should be redirecting to Microsoft");
      // Always redirecting — callback handled by appUrlOpen (native) or App.tsx useEffect (web)
    } catch (error: any) {
      console.error("[Outlook] OAuth error:", error);
      setOutlookError(error.message || `Failed to connect to Outlook. Please try again. [${APP_VERSION}]`);
      toast({
        title: "Error",
        description: "Failed to connect to Outlook. Please try again.",
        variant: "destructive",
      });
      setOutlookLoading(false);
    }
  };

  const testOutlookConnection = async () => {
    setOutlookError(null);
    try {
      await outlookCalendar.getEvents();
      toast({
        title: "Connection Successful",
        description: "Outlook Calendar API is working!",
      });
    } catch (error: any) {
      console.error("Outlook API test failed:", error);
      setOutlookError(error.message || `Failed to access Outlook Calendar. Please reconnect. [${APP_VERSION}]`);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to access Outlook Calendar. Please reconnect.",
        variant: "destructive",
      });
    }
  };

  const testGoogleConnection = async () => {
    setGoogleError(null);
    try {
      await googleCalendar.getEvents();
      toast({
        title: "Connection Successful",
        description: "Google Calendar API is working!",
      });
    } catch (error: any) {
      console.error("Google API test failed:", error);
      setGoogleError(error.message || `Failed to access Google Calendar. Please reconnect. [${APP_VERSION}]`);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to access Google Calendar. Please reconnect.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure your Canvas and Google Calendar connections
        </p>
      </div>

      <div className="space-y-6">
        {/* Canvas Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Canvas LMS
            </CardTitle>
            <CardDescription>
              Connect to your Canvas account to sync assignments, courses, and grades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {maskedToken ? (
              <>
                <p className="text-sm">
                  <span className="text-green-500">Connected to </span>
                  <span className="font-medium text-blue-500">{settings.canvasDomain}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setSettings((prev) => ({ ...prev, canvasDomain: "", canvasToken: "" }));
                      setMaskedToken("");
                      setTokenIsNew(false);
                      setCanvasTestResult(null);
                      try {
                        const saved = await secureStorage.getItem("co-captain-settings");
                        if (saved) {
                          const parsed = JSON.parse(saved);
                          delete parsed.canvasDomain;
                          delete parsed.canvasToken;
                          await secureStorage.setItem("co-captain-settings", JSON.stringify(parsed));
                        }
                      } catch {}
                      toast({ title: "Canvas Disconnected", description: "Domain and token have been cleared." });
                    }}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect Canvas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestCanvas}
                    disabled={canvasTesting}
                    className="h-10 shrink-0"
                    title="Test Connection"
                  >
                    {canvasTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
                {canvasTestResult && (
                  <div className={`flex items-center gap-2 text-sm ${canvasTestResult.ok ? "text-green-600" : "text-red-600"}`}>
                    {canvasTestResult.ok ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{canvasTestResult.message}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="canvasDomain">Canvas Domain</Label>
                  <Input
                    id="canvasDomain"
                    placeholder="canvas.instructure.com"
                    value={settings.canvasDomain}
                    autoCapitalize="none"
                    autoCorrect="off"
                    onChange={(e) =>
                      setSettings({ ...settings, canvasDomain: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Usually your institution's name followed by .instructure.com
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canvasToken">API Token</Label>
                  <Input
                    id="canvasToken"
                    type={tokenIsNew ? "text" : "password"}
                    placeholder="Enter your Canvas API token"
                    value={settings.canvasToken}
                    onChange={(e) => {
                      setSettings({ ...settings, canvasToken: e.target.value });
                      if (!tokenIsNew) setTokenIsNew(true);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your token from Canvas → Account → Settings → New Access Token
                  </p>
                  {Capacitor.isNativePlatform() && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScanToken}
                        className="w-full"
                      >
                        <ScanLine className="w-4 h-4 mr-2" />
                        Scan Token QR Code
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Copy your token on a computer, paste it into any QR code generator website, then scan it here
                      </p>
                    </>
                  )}
                </div>

                <Button
                  onClick={handleSave}
                  disabled={loading || !settings.canvasDomain || !settings.canvasToken}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Connect Canvas
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Google Calendar Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Google Calendar
            </CardTitle>
            <CardDescription>
              Connect your Google Calendar to sync events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.googleConnected ? (
              <>
                {settings.googleEmail && (
                  <p className="text-sm">
                    <span className="text-green-500">Signed in as </span>
                    <span className="font-medium text-blue-500">{settings.googleEmail}</span>
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleConnectGoogle}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect Google Account
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testGoogleConnection}
                    className="h-10 shrink-0"
                    title="Test Connection"
                  >
                    Test
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={handleConnectGoogle}
                  disabled={googleLoading}
                  className="w-full"
                >
                  {googleLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Google Account
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicking connect will redirect you to Google to authorize access
                </p>
              </>
            )}
            {googleError && (
              <p className="text-sm text-red-500 font-medium">{googleError} [{APP_VERSION}]</p>
            )}
          </CardContent>
        </Card>

        {/* Outlook Calendar Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Outlook Calendar
            </CardTitle>
            <CardDescription>
              Connect your Microsoft Outlook Calendar to sync events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.outlookConnected ? (
              <>
                {settings.outlookEmail && (
                  <p className="text-sm">
                    <span className="text-green-500">Signed in as </span>
                    <span className="font-medium text-blue-500">{settings.outlookEmail}</span>
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleConnectOutlook} className="flex-1">
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect Outlook Account
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testOutlookConnection}
                    className="h-10 shrink-0"
                    title="Test Connection"
                  >
                    Test
                  </Button>
                </div>
              </>
            ) : (
              <>
                {outlookError && (
                  <p className="text-sm text-red-500 font-medium">{outlookError} [{APP_VERSION}]</p>
                )}
                <Button onClick={handleConnectOutlook} disabled={outlookLoading} className="w-full">
                  {outlookLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Outlook Account
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicking connect will redirect you to Microsoft to authorize access
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Sync Settings
            </CardTitle>
            <CardDescription>
              Configure how often to sync data from Canvas and Google
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync data in the background
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSync}
                onChange={(e) => {
                  const updated = { ...settings, autoSync: e.target.checked };
                  setSettings(updated);
                  secureStorage.setItem("co-captain-settings", JSON.stringify(updated)).catch(console.error);
                }}
                className="w-5 h-5"
              />
            </div>

            {settings.autoSync && (
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                <Input
                  id="syncInterval"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.syncInterval}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 15;
                    const updated = {
                      ...settings,
                      syncInterval: Math.max(1, Math.min(60, val)),
                    };
                    setSettings(updated);
                    secureStorage.setItem("co-captain-settings", JSON.stringify(updated)).catch(console.error);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setTheme("dark")}
              >
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </Button>
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setTheme("light")}
              >
                <Sun className="w-4 h-4 mr-2" />
                Light
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Auth Debug Panel */}
        <div className="border rounded-lg p-3 bg-muted/40 text-xs">
          <button
            className="w-full flex items-center justify-between font-mono text-muted-foreground"
            onClick={() => {
              try {
                const raw = window.localStorage.getItem("co-captain-auth-log");
                setDebugLog(raw ? JSON.parse(raw) : []);
              } catch { /* ignore */ }
              setShowDebug((v) => !v);
            }}
          >
            <span>Auth Debug Log ({debugLog.length} entries)</span>
            <span>{showDebug ? "▲" : "▼"}</span>
          </button>
          {showDebug && (
            <div className="mt-2 space-y-0.5">
              {debugLog.length === 0 ? (
                <p className="text-muted-foreground font-mono">No entries yet. Try connecting Google.</p>
              ) : (
                debugLog.map((entry, i) => (
                  <p key={i} className="font-mono break-all text-[10px] leading-tight">{entry}</p>
                ))
              )}
              <button
                className="mt-2 text-red-500 font-mono"
                onClick={() => {
                  window.localStorage.removeItem("co-captain-auth-log");
                  setDebugLog([]);
                }}
              >
                Clear log
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
