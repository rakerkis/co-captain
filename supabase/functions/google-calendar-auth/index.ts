import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-auth/callback`;

    // Handle OAuth callback — no auth header needed (Google redirects here)
    if (path === 'callback' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokens);
        throw new Error('Failed to exchange code for tokens');
      }

      // Parse state to get user ID
      const userId = state ? JSON.parse(state).userId : null;
      
      if (!userId) {
        throw new Error('No user ID in state');
      }

      // Store tokens in database
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      
      const { error: dbError } = await supabase
        .from('google_calendar_tokens')
        .upsert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to store tokens');
      }

      // Get user's email from Google
      let googleEmail = '';
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          googleEmail = userInfo.email || '';
        }
      } catch { /* ignore */ }

      // Redirect back to settings page
      const redirectUrl = new URL('/settings', Deno.env.get('SUPABASE_URL')!.replace('.supabase.co', ''));
      // Use the app's origin (localhost in dev, production URL otherwise)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${Deno.env.get('APP_URL') || 'http://localhost:8080'}/settings?google_auth=success&google_email=${encodeURIComponent(googleEmail)}`,
        },
      });
    }

    // All other routes require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Handle OAuth initiation
    if ((path === 'google-calendar-auth' || path === 'initiate') && req.method === 'POST') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', JSON.stringify({ userId: user.id }));

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check connection status
    if (path === 'status' && req.method === 'GET') {
      const { data: tokenData, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      return new Response(
        JSON.stringify({ connected: !!tokenData && !tokenError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch calendar events
    if (path === 'events' && req.method === 'GET') {
      // Get stored token
      const { data: tokenData, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: 'Not authenticated with Google Calendar' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token is expired and refresh if needed
      let accessToken = tokenData.access_token;
      const expiresAt = new Date(tokenData.expires_at);
      
      if (expiresAt < new Date()) {
        // Refresh token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            refresh_token: tokenData.refresh_token,
            client_id: clientId!,
            client_secret: clientSecret!,
            grant_type: 'refresh_token',
          }),
        });

        const newTokens = await refreshResponse.json();
        
        if (refreshResponse.ok) {
          accessToken = newTokens.access_token;
          const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
          
          await supabase
            .from('google_calendar_tokens')
            .update({
              access_token: accessToken,
              expires_at: newExpiresAt.toISOString(),
            })
            .eq('user_id', user.id);
        }
      }

      // Fetch events from Google Calendar
      const timeMin = new Date();
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3);

      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${timeMin.toISOString()}&` +
        `timeMax=${timeMax.toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const events = await calendarResponse.json();
      
      if (!calendarResponse.ok) {
        console.error('Calendar API error:', events);
        throw new Error('Failed to fetch calendar events');
      }

      return new Response(
        JSON.stringify({ events: events.items || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Disconnect Google Calendar
    if (path === 'disconnect' && req.method === 'POST') {
      const { error: deleteError } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Failed to disconnect Google Calendar');
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});