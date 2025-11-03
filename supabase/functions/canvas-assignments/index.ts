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

    console.log('Fetching Canvas courses...');

    // First, get all active courses for the user
    const coursesResponse = await fetch(
      `${canvasUrl}/api/v1/courses?enrollment_state=active&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${canvasToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!coursesResponse.ok) {
      const errorText = await coursesResponse.text();
      console.error('Canvas API error fetching courses:', coursesResponse.status, errorText);
      throw new Error(`Canvas API error: ${coursesResponse.status}`);
    }

    const courses = await coursesResponse.json();
    console.log(`Found ${courses.length} active courses`);

    // Fetch assignments for each course
    const allAssignments = await Promise.all(
      courses.map(async (course: any) => {
        try {
          const assignmentsResponse = await fetch(
            `${canvasUrl}/api/v1/courses/${course.id}/assignments?per_page=100&order_by=due_at`,
            {
              headers: {
                'Authorization': `Bearer ${canvasToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (assignmentsResponse.ok) {
            const courseAssignments = await assignmentsResponse.json();
            // Add course info to each assignment
            return courseAssignments.map((assignment: any) => ({
              ...assignment,
              course_name: course.name,
            }));
          }
          return [];
        } catch (error) {
          console.error(`Error fetching assignments for course ${course.id}:`, error);
          return [];
        }
      })
    );

    const assignments = allAssignments.flat();
    console.log(`Found ${assignments.length} total assignments`);

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
