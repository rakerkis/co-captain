import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const canvasToken = Deno.env.get('CANVAS_API_TOKEN');
    const canvasUrl = Deno.env.get('CANVAS_INSTANCE_URL');

    if (!canvasToken || !canvasUrl) {
      throw new Error('Canvas credentials not configured');
    }

    // Set date range: 30 days in past to 90 days in future (120-day total)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`Fetching Canvas calendar events from ${startDateStr} to ${endDateStr}...`);

    const response = await fetch(
      `${canvasUrl}/api/v1/calendar_events?start_date=${startDateStr}&end_date=${endDateStr}&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${canvasToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Canvas API error:', response.status, errorText);
      throw new Error(`Canvas API error: ${response.status}`);
    }

    const events = await response.json();
    console.log(`Successfully fetched ${events.length} calendar events`);

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in canvas-calendar function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
