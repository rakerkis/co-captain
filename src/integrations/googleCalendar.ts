// Google Calendar API Service
// Uses Supabase OAuth provider token for authentication

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
  // Get the Google provider token from the current Supabase session
  private async getProviderToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_token ?? null;
  }

  // Check if the user signed in via Google (has a provider token)
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getProviderToken();
    return !!token;
  }

  // Connect Google Calendar by re-authenticating with calendar scope
  async connect(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/settings`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
      },
    });
    if (error) throw error;
  }

  // Disconnect just clears the local awareness; user stays signed in
  // A full disconnect would require revoking the token at Google
  disconnect(): void {
    // No-op: the provider token lives in the Supabase session.
    // To fully revoke, call the Google revoke endpoint.
  }

  // Fetch calendar events using the Supabase session's provider token
  async getEvents(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    const token = await this.getProviderToken();
    if (!token) {
      throw new Error('Not authenticated with Google. Please sign in with Google first.');
    }

    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Google token expired. Please sign in with Google again.');
      }
      if (response.status === 403) {
        throw new Error('Calendar access not granted. Please reconnect with calendar permissions.');
      }
      throw new Error('Failed to fetch calendar events');
    }

    const data = await response.json();
    return data.items || [];
  }
}

export const googleCalendar = new GoogleCalendarService();
export default googleCalendar;
