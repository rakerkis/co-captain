import { useState, useEffect } from "react";
import { Settings, Save, ExternalLink, Globe, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { localStorage } from "@/integrations/storage";
import { supabase } from "@/integrations/supabase/client";
import { googleCalendar } from "@/integrations/googleCalendar";

interface SettingsData {
  canvasDomain: string;
  canvasToken: string;
  googleConnected: boolean;
  googleEmail?: string;
  autoSync: boolean;
  syncInterval: number;
}

const SettingsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsData>({
    canvasDomain: "frs.instructure.com",
    canvasToken: "",
    googleConnected: false,
    googleEmail: "",
    autoSync: true,
    syncInterval: 15,
  });

  const [googleStatus, setGoogleStatus] = useState<string | null>(null);

  useEffect(() => {
    // Load settings from local storage
    const savedSettings = localStorage.getItem("co-captain-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
    }

    // Check URL hash for OAuth error FIRST
    let hashError: string | null = null;
    const hash = window.location.hash;
    if (hash.includes("error")) {
      const params = new URLSearchParams(hash.substring(1));
      hashError = params.get("error_description") || params.get("error") || "OAuth failed";
      console.error("[Settings] OAuth error in URL hash:", hashError);
      setGoogleError(hashError);
      // Clean up the URL hash
      window.history.replaceState(null, "", window.location.pathname);
    }

    const markConnected = (email: string, showToast = false) => {
      window.localStorage.setItem("google-connected-email", email);
      setSettings((prev) => ({
        ...prev,
        googleConnected: true,
        googleEmail: email,
      }));
      setGoogleError(null);
      setGoogleStatus("Connected successfully!");
      if (showToast) {
        toast({
          title: "Google Connected",
          description: `Connected as ${email}`,
        });
      }
    };

    // Listen for auth state changes (catches the OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[Settings] Auth state change:", _event, {
        hasProviderToken: !!session?.provider_token,
        provider: session?.user?.app_metadata?.provider,
        email: session?.user?.email,
      });

      if (session?.provider_token) {
        markConnected(session.user?.email || "", true);
      } else if (session?.user?.app_metadata?.provider === 'google' ||
                 session?.user?.identities?.some(i => i.provider === 'google')) {
        const savedEmail = window.localStorage.getItem("google-connected-email") || session.user?.email || "";
        setSettings((prev) => ({
          ...prev,
          googleConnected: true,
          googleEmail: savedEmail,
        }));
      }
    });

    // Also check current session (don't overwrite hash error)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[Settings] Session check:", {
        hasSession: !!session,
        hasProviderToken: !!session?.provider_token,
        provider: session?.user?.app_metadata?.provider,
        identities: session?.user?.identities?.map(i => i.provider),
        email: session?.user?.email,
      });

      if (session?.provider_token) {
        markConnected(session.user?.email || "", false);
      } else if (session?.user?.app_metadata?.provider === 'google' ||
                 session?.user?.identities?.some(i => i.provider === 'google')) {
        const savedEmail = window.localStorage.getItem("google-connected-email") || session.user?.email || "";
        setSettings((prev) => ({
          ...prev,
          googleConnected: true,
          googleEmail: savedEmail,
        }));
        if (!hashError) {
          setGoogleError("Google Calendar token expired. Please reconnect to sync events.");
        }
      }
      // Don't clear googleError here — preserve hash errors
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to local storage
      localStorage.setItem("co-captain-settings", JSON.stringify(settings));
      
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

  const handleConnectGoogle = async () => {
    if (settings.googleConnected) {
      // Disconnect — clear local state
      googleCalendar.disconnect();
      window.localStorage.removeItem("google-connected-email");
      setSettings((prev) => ({ ...prev, googleConnected: false, googleEmail: "" }));
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
    try {
      // Use Supabase Google OAuth with calendar scope
      await googleCalendar.connect();
    } catch (error: any) {
      console.error("Google OAuth error:", error);
      setGoogleError(error.message || "Failed to connect to Google. Please try again.");
      toast({
        title: "Error",
        description: "Failed to connect to Google. Please try again.",
        variant: "destructive",
      });
      setGoogleLoading(false);
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
      setGoogleError(error.message || "Failed to access Google Calendar. Please reconnect.");
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
            <div className="space-y-2">
              <Label htmlFor="canvasDomain">Canvas Domain</Label>
              <Input
                id="canvasDomain"
                placeholder="frs.instructure.com"
                value={settings.canvasDomain}
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
                type="password"
                placeholder="Enter your Canvas API token"
                value={settings.canvasToken}
                onChange={(e) =>
                  setSettings({ ...settings, canvasToken: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Get your token from Canvas → Account → Settings → New Access Token
              </p>
            </div>
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
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected to Google Calendar</span>
                </div>
                {settings.googleEmail && (
                  <p className="text-sm text-muted-foreground">
                    Signed in as <span className="font-medium text-foreground">{settings.googleEmail}</span>
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={handleConnectGoogle}
                  className="w-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Disconnect Google Account
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testGoogleConnection}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test Connection
                </Button>
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
              <p className="text-sm text-red-500 font-medium">{googleError}</p>
            )}
            {googleStatus && !googleError && (
              <p className="text-sm text-green-500 font-medium">{googleStatus}</p>
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
                onChange={(e) =>
                  setSettings({ ...settings, autoSync: e.target.checked })
                }
                className="w-5 h-5"
              />
            </div>

            {settings.autoSync && (
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                <Input
                  id="syncInterval"
                  type="number"
                  min={5}
                  max={60}
                  value={settings.syncInterval}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      syncInterval: parseInt(e.target.value) || 15,
                    })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
