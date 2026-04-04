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

  return useMutation({
    mutationFn: async () => {
      await googleCalendar.connect();
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

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