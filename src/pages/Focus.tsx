import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Focus = () => {
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const totalSeconds = mode === "focus" ? focusDuration * 60 : breakDuration * 60;
  const currentSeconds = minutes * 60 + seconds;
  const progress = ((totalSeconds - currentSeconds) / totalSeconds) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            setIsActive(false);
            // Timer completed
            if (mode === "focus") {
              setMode("break");
              setMinutes(breakDuration);
            } else {
              setMode("focus");
              setMinutes(focusDuration);
            }
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds, mode, focusDuration, breakDuration]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === "focus") {
      setMinutes(focusDuration);
      setSeconds(0);
    } else {
      setMinutes(breakDuration);
      setSeconds(0);
    }
  };

  const switchMode = (newMode: "focus" | "break") => {
    setMode(newMode);
    setIsActive(false);
    if (newMode === "focus") {
      setMinutes(focusDuration);
      setSeconds(0);
    } else {
      setMinutes(breakDuration);
      setSeconds(0);
    }
  };

  const saveSettings = (newFocus: number, newBreak: number) => {
    setFocusDuration(newFocus);
    setBreakDuration(newBreak);
    if (mode === "focus") {
      setMinutes(newFocus);
    } else {
      setMinutes(newBreak);
    }
    setSeconds(0);
    setIsActive(false);
    setSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Focus Timer</h1>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Timer Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="focus-duration">Focus Duration (minutes)</Label>
                  <Input
                    id="focus-duration"
                    type="number"
                    min="1"
                    max="120"
                    defaultValue={focusDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0 && val <= 120) {
                        saveSettings(val, breakDuration);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                  <Input
                    id="break-duration"
                    type="number"
                    min="1"
                    max="60"
                    defaultValue={breakDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0 && val <= 60) {
                        saveSettings(focusDuration, val);
                      }
                    }}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Pomodoro Timer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={mode === "focus" ? "default" : "outline"}
                  onClick={() => switchMode("focus")}
                  className="flex-1"
                >
                  Focus ({focusDuration}m)
                </Button>
                <Button
                  variant={mode === "break" ? "default" : "outline"}
                  onClick={() => switchMode("break")}
                  className="flex-1"
                >
                  Break ({breakDuration}m)
                </Button>
              </div>

              {/* Timer Display */}
              <div className="text-center py-8">
                <div className="text-8xl font-bold text-foreground mb-4">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </div>
                <p className="text-lg text-muted-foreground">
                  {mode === "focus" ? "Focus Time" : "Break Time"}
                </p>
              </div>

              {/* Progress Bar */}
              <Progress value={progress} className="h-3" />

              {/* Controls */}
              <div className="flex gap-3 justify-center">
                <Button onClick={toggleTimer} size="lg" className="gap-2 px-8">
                  {isActive ? (
                    <>
                      <Pause className="w-5 h-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start
                    </>
                  )}
                </Button>
                <Button onClick={resetTimer} variant="outline" size="lg" className="gap-2 px-8">
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Focus;
