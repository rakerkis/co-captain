// Google Calendar API Service
// Uses OAuth 2.0 for authentication

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/settings`;
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ');

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
  private accessToken: string | null = null;

  // Generate OAuth URL
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'token',
      scope: GOOGLE_SCOPES,
      include_granted_scopes: 'true',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Handle OAuth callback - extract token from URL hash
  handleCallback(): boolean {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        this.accessToken = token;
        localStorage.setItem('google_access_token', token);
        
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
        return true;
      }
    }
    return false;
  }

  // Check if already authenticated
  isAuthenticated(): boolean {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('google_access_token');
    }
    return !!this.accessToken;
  }

  // Get stored token
  getToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('google_access_token');
    }
    return this.accessToken;
  }

  // Disconnect (clear token)
  disconnect(): void {
    this.accessToken = null;
    localStorage.removeItem('google_access_token');
  }

  // Fetch calendar events
  async getEvents(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        this.disconnect();
        throw new Error('Token expired. Please reconnect.');
      }
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    return data.items || [];
  }

  // Create a calendar event
  async createEvent(event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
  }): Promise<GoogleCalendarEvent> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: {
            dateTime: event.start,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: event.end,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create event');
    }

    return response.json();
  }
}

export const googleCalendar = new GoogleCalendarService();
export default googleCalendar;
