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

      // Parse state to get user ID and optional redirect scheme (for native apps)
      const parsedState = state ? JSON.parse(state) : {};
      const userId = parsedState.userId ?? null;
      const redirectScheme = parsedState.redirectScheme ?? null;

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

      const successParams = `google_auth=success&google_email=${encodeURIComponent(googleEmail)}`;

      if (redirectScheme) {
        // Native app: use a JS redirect page instead of a bare 302.
        // On iOS 16+, SFSafariViewController silently drops server-side 302
        // redirects to custom URL schemes. A JS redirect (or a tappable link)
        // is handled at the page level and correctly triggers the OS URL
        // handler, which fires appUrlOpen in App.tsx.
        const returnUrl = `${redirectScheme}://settings?${successParams}`;
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connected!</title>
  <script>window.location.replace('${returnUrl}');</script>
</head>
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:3rem 1.5rem;background:#fff">
  <p style="font-size:3rem;margin:0">&#10003;</p>
  <h2 style="margin:0.5rem 0">Google Calendar connected!</h2>
  <p style="color:#555;margin:0.5rem 0 1.5rem">Returning to the app&hellip;</p>
  <a href="${returnUrl}" style="display:inline-block;padding:0.75rem 2rem;background:#4285f4;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:1rem">Open App</a>
</body>
</html>`;
        return new Response(html, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        });
      }

      // Web: standard redirect to the settings page
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${Deno.env.get('APP_URL') || 'http://localhost:8080'}/settings?${successParams}` },
      });
    }

    // Refresh Google access token — no JWT auth required.
    // The client passes the user_id and refresh_token (read from DB via PostgREST).
    // This endpoint uses the server-side client_secret to perform the refresh grant.
    if (path === 'refresh' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { user_id, refresh_token } = body;

      if (!user_id || !refresh_token) {
        return new Response(
          JSON.stringify({ error: 'user_id and refresh_token are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token,
          client_id: clientId!,
          client_secret: clientSecret!,
          grant_type: 'refresh_token',
        }),
      });

      const newTokens = await refreshResponse.json();

      if (!refreshResponse.ok) {
        console.error('Google token refresh failed:', JSON.stringify(newTokens));
        console.error('Google error:', newTokens.error, '|', newTokens.error_description);
        // Common causes: "invalid_grant" = refresh token expired (Testing mode: 7-day limit)
        //                                  or token revoked by user
        return new Response(
          JSON.stringify({
            error: newTokens.error_description || 'Token refresh failed',
            google_error: newTokens.error || null,
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update the DB with the new access token (and rotated refresh token if Google returned one)
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      const updatePayload: Record<string, string> = {
        access_token: newTokens.access_token,
        expires_at: newExpiresAt.toISOString(),
      };
      if (newTokens.refresh_token) {
        // Google rotated the refresh token — save the new one
        updatePayload.refresh_token = newTokens.refresh_token;
        console.log('Google rotated refresh token for user', user_id);
      }
      await supabase
        .from('google_calendar_tokens')
        .update(updatePayload)
        .eq('user_id', user_id);

      return new Response(
        JSON.stringify({
          access_token: newTokens.access_token,
          expires_in: newTokens.expires_in,
          refresh_token_rotated: !!newTokens.refresh_token,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      const body = await req.json().catch(() => ({}));
      const redirectSchemeFromClient = body.redirectScheme ?? null;

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', JSON.stringify({ userId: user.id, redirectScheme: redirectSchemeFromClient }));

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store tokens directly (used after Google sign-in to auto-connect calendar)
    if (path === 'store' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { access_token, refresh_token } = body;
      if (!access_token) throw new Error('No access_token provided');

      const expiresAt = new Date(Date.now() + 3600 * 1000); // Google tokens expire in 1h
      const { error: dbError } = await supabase
        .from('google_calendar_tokens')
        .upsert({
          user_id: user.id,
          access_token,
          refresh_token: refresh_token || null,
          expires_at: expiresAt.toISOString(),
        }, { onConflict: 'user_id' });

      if (dbError) throw new Error('Failed to store tokens');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // If this was an OAuth callback (GET with ?code=), show an HTML error page
    // rather than raw JSON so the user isn't left stranded in SFSafariViewController.
    const reqUrl = new URL(req.url);
    if (req.method === 'GET' && reqUrl.searchParams.has('code')) {
      const state = reqUrl.searchParams.get('state') ?? '';
      let redirectScheme: string | null = null;
      try { redirectScheme = JSON.parse(state).redirectScheme ?? null; } catch { /* ignore */ }
      const returnUrl = redirectScheme ? `${redirectScheme}://` : null;

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connection Failed</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f2f2f7; color: #1c1c1e; }
    .card { background: white; border-radius: 16px; padding: 40px 28px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.08); max-width: 320px; width: 90%; }
    .icon { font-size: 52px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 15px; color: #6e6e73; line-height: 1.4; margin-bottom: 24px; }
    .btn { display: inline-block; background: #007aff; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Connection Failed</h1>
    <p>Could not connect Google Calendar. Please try again.</p>
    ${returnUrl ? `<a href="${returnUrl}" class="btn">Return to Co-Captain</a>` : ''}
  </div>
</body>
</html>`;
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});