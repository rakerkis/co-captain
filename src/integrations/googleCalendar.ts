// Google Calendar API Service
// Uses Supabase Edge Function for OAuth with refresh token support

import { supabase } from '@/integrations/supabase/client';

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
  location?: string;
  colorId?: string;
}

class GoogleCalendarService {
  // Check if the user has Google Calendar tokens stored in the database
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data, error } = await supabase.functions.invoke('google-calendar-auth/status', {
      method: 'GET',
    });

    return data?.connected === true;
  }

  // Start OAuth flow — if not signed in, sign in with Google first (which also gets calendar scope)
  // If already signed in, use the Edge Function for a separate calendar-only OAuth
  async connect(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Not signed in at all — sign in with Google via Supabase, requesting calendar scope
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/settings`,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        },
      });
      if (error) throw error;
      return; // Will redirect to Google
    }

    // Already signed in — use Edge Function for calendar OAuth with refresh token
    const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
      body: {},
    });

    if (error) throw error;
    if (!data?.authUrl) throw new Error('Failed to get authorization URL');

    // Redirect to Google's consent screen
    window.location.href = data.authUrl;
  }

  // Disconnect — remove tokens from database via Edge Function
  async disconnect(): Promise<void> {
    const { error } = await supabase.functions.invoke('google-calendar-auth/disconnect', {
      method: 'POST',
      body: {},
    });
    if (error) throw error;
  }

  // Fetch calendar events via Edge Function (auto-refreshes expired tokens)
  async getEvents(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    const { data, error } = await supabase.functions.invoke('google-calendar-auth/events', {
      method: 'GET',
    });

    if (error) {
      throw new Error('Failed to fetch calendar events. Please reconnect Google Calendar.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.events || [];
  }
}

export const googleCalendar = new GoogleCalendarService();
export default googleCalendar;
