import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const state = JSON.stringify({ userId: user.id });
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { state },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.authUrl) {
        window.open(data.authUrl, '_blank');
        toast({
          title: "Authorization Started",
          description: "Complete the authorization in the popup window",
        });
      }
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
  return useQuery({
    queryKey: ["google-calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth/events');

      if (error) {
        if (error.message?.includes('Not authenticated')) {
          return { events: [], isConnected: false };
        }
        throw error;
      }

      return { events: data.events as GoogleCalendarEvent[], isConnected: true };
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGoogleCalendarDisconnect = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('google-calendar-auth/disconnect', {
        method: 'POST',
      });

      if (error) throw error;
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