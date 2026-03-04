import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "./components/Sidebar";
import { AuthForm } from "./components/AuthForm";
import Index from "./pages/Index";
import Assignments from "./pages/Assignments";
import GPA from "./pages/GPA";
import Courses from "./pages/Courses";
import Focus from "./pages/Focus";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <div className="flex min-h-screen w-full">
            <Sidebar session={session} />
            <main className="flex-1">
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
            </main>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
