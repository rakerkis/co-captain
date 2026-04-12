import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { outlookCalendar } from "@/integrations/outlookCalendar";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  webLink?: string;
}

export const useOutlookCalendarAuth = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await outlookCalendar.connect();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlook-calendar-events"] });
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

export const useOutlookCalendarEvents = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });

    const onOutlookDone = () => {
      setIsSignedIn(true);
      queryClient.invalidateQueries({ queryKey: ["outlook-calendar-events"] });
    };
    window.addEventListener("co-captain:outlook-auth-done", onOutlookDone);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("co-captain:outlook-auth-done", onOutlookDone);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["outlook-calendar-events"],
    queryFn: async () => {
      try {
        const events = await outlookCalendar.getEvents();
        return { events: events as OutlookCalendarEvent[], isConnected: true };
      } catch {
        return { events: [], isConnected: false };
      }
    },
    enabled: isSignedIn,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOutlookCalendarDisconnect = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await outlookCalendar.disconnect();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlook-calendar-events"] });
      toast({
        title: "Disconnected",
        description: "Outlook Calendar has been disconnected",
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
