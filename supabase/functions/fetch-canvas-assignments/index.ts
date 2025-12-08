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

    // Fetch active courses
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
      console.error('Canvas courses API error:', coursesResponse.status, errorText);
      throw new Error(`Canvas API error: ${coursesResponse.status}`);
    }

    const courses = await coursesResponse.json();
    console.log(`Found ${courses.length} active courses`);

    // Fetch assignments for each course
    const allAssignments = [];

    for (const course of courses) {
      try {
        // Fetch assignments with submission status included
        const assignmentsResponse = await fetch(
          `${canvasUrl}/api/v1/courses/${course.id}/assignments?per_page=100&include[]=submission`,
          {
            headers: {
              'Authorization': `Bearer ${canvasToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (assignmentsResponse.ok) {
          const assignments = await assignmentsResponse.json();
          
          // Filter out submitted/graded assignments and add course info/priority
          const enrichedAssignments = assignments
            .filter((assignment: any) => {
              // Check if assignment has been submitted
              const submission = assignment.submission;
              if (!submission) return true; // No submission data, include it
              
              // Filter out if:
              // - workflow_state is 'submitted', 'graded', or 'pending_review'
              // - has submitted_at timestamp
              // - has a score or grade assigned
              const isSubmitted = 
                submission.workflow_state === 'submitted' || 
                submission.workflow_state === 'graded' ||
                submission.workflow_state === 'pending_review' ||
                submission.submitted_at != null ||
                submission.score != null ||
                (submission.grade != null && submission.grade !== '');
              
              console.log(`Assignment ${assignment.id}: workflow_state=${submission.workflow_state}, submitted_at=${submission.submitted_at}, isSubmitted=${isSubmitted}`);
              return !isSubmitted;
            })
            .map((assignment: any) => {
              // Calculate priority based on due date
              let priority = 'low';
              if (assignment.due_at) {
                const daysUntilDue = Math.floor(
                  (new Date(assignment.due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                
                if (daysUntilDue < 0) {
                  priority = 'high'; // Overdue
                } else if (daysUntilDue <= 3) {
                  priority = 'high'; // Due within 3 days
                } else if (daysUntilDue <= 7) {
                  priority = 'medium'; // Due within a week
                }
              }

              return {
                ...assignment,
                course_name: course.name,
                course_code: course.course_code || course.name,
                priority,
              };
            });

          allAssignments.push(...enrichedAssignments);
        }
      } catch (error) {
        console.error(`Error fetching assignments for course ${course.id}:`, error);
      }
    }

    console.log(`Found ${allAssignments.length} total assignments`);

    // Extract unique courses with their URLs and fetch enrollments for grades
    const coursesWithGrades = await Promise.all(courses.map(async (course: any) => {
      let currentGrade = null;
      let currentScore = null;
      
      try {
        // Fetch enrollment for this course to get grades
        const enrollmentResponse = await fetch(
          `${canvasUrl}/api/v1/courses/${course.id}/enrollments?user_id=self`,
          {
            headers: {
              'Authorization': `Bearer ${canvasToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (enrollmentResponse.ok) {
          const enrollments = await enrollmentResponse.json();
          // Find student enrollment
          const studentEnrollment = enrollments.find((e: any) => e.type === 'StudentEnrollment');
          if (studentEnrollment?.grades) {
            currentGrade = studentEnrollment.grades.current_grade;
            currentScore = studentEnrollment.grades.current_score;
          }
        }
      } catch (error) {
        console.error(`Error fetching enrollment for course ${course.id}:`, error);
      }
      
      return {
        id: course.id,
        name: course.name,
        course_code: course.course_code || course.name,
        html_url: `${canvasUrl}/courses/${course.id}`,
        current_grade: currentGrade,
        current_score: currentScore,
      };
    }));

    return new Response(JSON.stringify({ assignments: allAssignments, courses: coursesWithGrades }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-canvas-assignments function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
