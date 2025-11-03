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

    console.log('Fetching Canvas assignments...');

    const response = await fetch(
      `${canvasUrl}/api/v1/users/self/todo/assignment_ids?per_page=100`,
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

    const assignmentIds = await response.json();
    console.log(`Found ${assignmentIds.length} assignment IDs`);

    // Fetch detailed info for each assignment
    const assignments = await Promise.all(
      assignmentIds.slice(0, 50).map(async (id: string) => {
        try {
          const detailResponse = await fetch(
            `${canvasUrl}/api/v1/courses/0/assignments/${id}`,
            {
              headers: {
                'Authorization': `Bearer ${canvasToken}`,
              },
            }
          );
          
          if (detailResponse.ok) {
            return await detailResponse.json();
          }
          return null;
        } catch (error) {
          console.error(`Error fetching assignment ${id}:`, error);
          return null;
        }
      })
    );

    const validAssignments = assignments.filter(a => a !== null);
    console.log(`Successfully fetched ${validAssignments.length} assignments`);

    return new Response(JSON.stringify({ assignments: validAssignments }), {
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
