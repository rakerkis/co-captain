import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { googleCalendar } from "@/integrations/googleCalendar";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

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
  htmlLink?: string;
}

export const useGoogleCalendarAuth = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await googleCalendar.connect();
    },
    onSuccess: () => {
      // Re-fetch events now that the user may have connected
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
    },
    onError: (error) => {
      toast({
        title: "Authorization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useGoogleCalendarEvents = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
      if (session) {
        // Refetch events whenever session changes (e.g. after OAuth)
        queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
      }
    });

    // Also listen for the custom event dispatched from App.tsx after Google OAuth
    const onGoogleDone = () => {
      setIsSignedIn(true);
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
    };
    window.addEventListener("co-captain:google-auth-done", onGoogleDone);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("co-captain:google-auth-done", onGoogleDone);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["google-calendar-events"],
    queryFn: async () => {
      try {
        const events = await googleCalendar.getEvents();
        return { events: events as GoogleCalendarEvent[], isConnected: true };
      } catch {
        return { events: [], isConnected: false };
      }
    },
    enabled: isSignedIn,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGoogleCalendarDisconnect = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Sign out and sign back in without Google to remove provider token
      googleCalendar.disconnect();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected",
      });
    },
    onError: (error) => {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};