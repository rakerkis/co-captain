// Direct Canvas API client using per-user credentials from localStorage
// Uses a CORS proxy for browser requests since Canvas doesn't support CORS

import { supabase } from "@/integrations/supabase/client";

interface CanvasSettings {
  canvasDomain: string;
  canvasToken: string;
}

function getCanvasSettings(): CanvasSettings | null {
  const saved = window.localStorage.getItem("co-captain-settings");
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (!parsed.canvasDomain || !parsed.canvasToken) return null;
    return { canvasDomain: parsed.canvasDomain, canvasToken: parsed.canvasToken };
  } catch {
    return null;
  }
}

async function canvasFetch(path: string, token: string, baseUrl: string) {
  // Use Supabase Edge Function as CORS proxy, passing user's own credentials
  const { data, error } = await supabase.functions.invoke("canvas-proxy", {
    body: {
      url: `https://${baseUrl}/api/v1${path}`,
      token,
    },
  });

  if (error) {
    // Fallback: try direct fetch (works in mobile/Capacitor, may fail in browser)
    try {
      const response = await fetch(`https://${baseUrl}/api/v1${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Canvas API error ${response.status}`);
      return response.json();
    } catch (directError) {
      throw error;
    }
  }

  return data;
}

export interface CanvasAssignmentRaw {
  id: number;
  name: string;
  due_at: string | null;
  html_url: string;
  submission?: {
    workflow_state?: string;
    submitted_at?: string | null;
    score?: number | null;
    grade?: string | null;
  };
}

export interface CanvasEnrichedAssignment {
  id: number;
  name: string;
  due_at: string | null;
  course_name: string;
  course_code: string;
  course_id: number;
  priority: "high" | "medium" | "low";
  html_url: string;
}

export interface CanvasCourseWithGrades {
  id: number;
  name: string;
  course_code: string;
  html_url: string;
  current_grade: string | null;
  current_score: number | null;
}

export async function fetchCanvasData(): Promise<{
  assignments: CanvasEnrichedAssignment[];
  courses: CanvasCourseWithGrades[];
}> {
  const settings = getCanvasSettings();
  if (!settings) {
    throw new Error("Canvas credentials not configured. Go to Settings to add your Canvas domain and API token.");
  }

  const { canvasDomain, canvasToken } = settings;

  // Fetch active courses
  const courses: any[] = await canvasFetch(
    "/courses?enrollment_state=active&per_page=100",
    canvasToken,
    canvasDomain
  );

  // Fetch assignments for each course
  const allAssignments: CanvasEnrichedAssignment[] = [];

  for (const course of courses) {
    try {
      const assignments: CanvasAssignmentRaw[] = await canvasFetch(
        `/courses/${course.id}/assignments?per_page=100&include[]=submission`,
        canvasToken,
        canvasDomain
      );

      const enriched = assignments
        .filter((assignment) => {
          const submission = assignment.submission;
          if (!submission) return true;

          const isSubmitted =
            submission.workflow_state === "submitted" ||
            submission.workflow_state === "graded" ||
            submission.workflow_state === "pending_review" ||
            submission.submitted_at != null ||
            submission.score != null ||
            (submission.grade != null && submission.grade !== "");

          return !isSubmitted;
        })
        .map((assignment) => {
          let priority: "high" | "medium" | "low" = "low";
          if (assignment.due_at) {
            const daysUntilDue = Math.floor(
              (new Date(assignment.due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilDue < 0 || daysUntilDue <= 3) {
              priority = "high";
            } else if (daysUntilDue <= 7) {
              priority = "medium";
            }
          }

          return {
            id: assignment.id,
            name: assignment.name,
            due_at: assignment.due_at,
            course_name: course.name,
            course_code: course.course_code || course.name,
            course_id: course.id,
            priority,
            html_url: assignment.html_url,
          };
        });

      allAssignments.push(...enriched);
    } catch (error) {
      console.error(`Error fetching assignments for course ${course.id}:`, error);
    }
  }

  // Fetch grades for each course
  const coursesWithGrades: CanvasCourseWithGrades[] = await Promise.all(
    courses.map(async (course) => {
      let currentGrade: string | null = null;
      let currentScore: number | null = null;

      try {
        const enrollments: any[] = await canvasFetch(
          `/courses/${course.id}/enrollments?user_id=self`,
          canvasToken,
          canvasDomain
        );
        const studentEnrollment = enrollments.find((e) => e.type === "StudentEnrollment");
        if (studentEnrollment?.grades) {
          currentGrade = studentEnrollment.grades.current_grade;
          currentScore = studentEnrollment.grades.current_score;
        }
      } catch (error) {
        console.error(`Error fetching enrollment for course ${course.id}:`, error);
      }

      return {
        id: course.id,
        name: course.name,
        course_code: course.course_code || course.name,
        html_url: `https://${canvasDomain}/courses/${course.id}`,
        current_grade: currentGrade,
        current_score: currentScore,
      };
    })
  );

  return { assignments: allAssignments, courses: coursesWithGrades };
}
