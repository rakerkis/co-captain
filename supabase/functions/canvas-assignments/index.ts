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

    console.log('Fetching Canvas planner items...');

    // Get date range: 30 days in past to 90 days in future (120-day total range)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);

    const response = await fetch(
      `${canvasUrl}/api/v1/planner/items?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&per_page=100`,
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

    const plannerItems = await response.json();
    console.log(`Successfully fetched ${plannerItems.length} planner items`);

    // Extract assignments from planner items
    const assignments = plannerItems
      .filter((item: any) => item.plannable_type === 'assignment')
      .map((item: any) => ({
        ...item.plannable,
        course_id: item.course_id,
        html_url: item.html_url,
      }));

    console.log(`Found ${assignments.length} assignments`);

    return new Response(JSON.stringify({ assignments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in canvas-assignments function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
