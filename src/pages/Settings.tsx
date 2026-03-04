import { useState, useEffect } from "react";
import { Settings, Save, ExternalLink, Key, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { localStorage } from "@/integrations/storage";

interface SettingsData {
  canvasDomain: string;
  canvasToken: string;
  googleConnected: boolean;
  autoSync: boolean;
  syncInterval: number;
}

const SettingsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    canvasDomain: "frs.instructure.com",
    canvasToken: "",
    googleConnected: false,
    autoSync: true,
    syncInterval: 15,
  });

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

  const handleConnectGoogle = () => {
    // Google OAuth will be implemented here
    toast({
      title: "Coming Soon",
      description: "Google Calendar integration will be available soon.",
    });
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
          <CardContent>
            <Button
              variant={settings.googleConnected ? "outline" : "default"}
              onClick={handleConnectGoogle}
              className="w-full"
            >
              {settings.googleConnected ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconnect Google Account
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Google Account
                </>
              )}
            </Button>
            {settings.googleConnected && (
              <p className="text-sm text-green-600 mt-2 text-center">
                ✓ Connected
              </p>
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
