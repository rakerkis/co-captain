// Direct Canvas API client using per-user credentials
// Credentials are stored in the device Keychain/Keystore on native, localStorage on web
// Uses a CORS proxy for browser requests since Canvas doesn't support CORS

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { secureStorage } from "@/integrations/secureStorage";

interface CanvasSettings {
  canvasDomain: string;
  canvasToken: string;
}

async function getCanvasSettings(): Promise<CanvasSettings | null> {
  const saved = await secureStorage.getItem("co-captain-settings");
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
  // On native platforms (iOS/Android), call Canvas API directly — no CORS restrictions.
  // Only use the Supabase Edge Function proxy on web where CORS blocks direct calls.
  if (Capacitor.isNativePlatform()) {
    // Use CapacitorHttp for native — bypasses WKWebView CORS enforcement
    // (Canvas API doesn't send CORS headers, so regular fetch fails in the WebView)
    let nativeResp;
    try {
      nativeResp = await CapacitorHttp.get({
        url: `https://${baseUrl}/api/v1${path}`,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (networkErr) {
      throw new Error(`Network error connecting to ${baseUrl} — check your domain and internet connection.`);
    }
    if (nativeResp.status === 401) throw new Error("Invalid Canvas token — please check your API token in Settings.");
    if (nativeResp.status === 403) throw new Error("Canvas token does not have permission for this resource.");
    if (nativeResp.status >= 400) throw new Error(`Canvas API error ${nativeResp.status}`);
    return nativeResp.data;
  }

  // Web: use Supabase Edge Function as CORS proxy
  const { data, error } = await supabase.functions.invoke("canvas-proxy", {
    body: {
      url: `https://${baseUrl}/api/v1${path}`,
      token,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Lightweight connection test — fetches only courses (no assignments or grades).
 */
export async function testCanvasConnection(): Promise<{ ok: boolean; courseCount: number }> {
  const settings = await getCanvasSettings();
  if (!settings) {
    throw new Error("Canvas credentials not configured. Go to Settings to add your Canvas domain and API token.");
  }

  const { canvasDomain, canvasToken } = settings;
  const courses: any[] = await canvasFetch(
    "/courses?enrollment_state=active&per_page=100",
    canvasToken,
    canvasDomain
  );

  return { ok: true, courseCount: Array.isArray(courses) ? courses.length : 0 };
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
  const settings = await getCanvasSettings();
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

  // Fetch assignments for all courses in parallel
  const assignmentResults = await Promise.all(
    courses.map(async (course) => {
      try {
        const assignments: CanvasAssignmentRaw[] = await canvasFetch(
          `/courses/${course.id}/assignments?per_page=100&include[]=submission`,
          canvasToken,
          canvasDomain
        );

        return assignments
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
      } catch (error) {
        console.error(`Error fetching assignments for course ${course.id}:`, error);
        return [];
      }
    })
  );

  const allAssignments: CanvasEnrichedAssignment[] = assignmentResults.flat();

  // Fetch all enrollments for the current user in one call
  let allEnrollments: any[] = [];
  try {
    allEnrollments = await canvasFetch(
      "/users/self/enrollments?per_page=100&state[]=active",
      canvasToken,
      canvasDomain
    );
  } catch (error) {
    console.error("Error fetching enrollments:", error);
  }

  // Check if user is an observer (parent account) — observers don't have grades directly,
  // we need to look up the observed student's enrollments
  const isObserver = allEnrollments.length > 0 && allEnrollments.every((e: any) => e.type === "ObserverEnrollment");

  // Build a map of course_id → grades
  const gradeMap = new Map<number, { grade: string | null; score: number | null }>();

  if (isObserver) {
    // For observer accounts, find the observed user and fetch their enrollments
    const firstEnrollment = allEnrollments[0];
    const observedUserId = firstEnrollment?.associated_user_id;

    if (observedUserId) {
      // Fetch the observed student's enrollments with grades
      try {
        const studentEnrollments: any[] = await canvasFetch(
          `/users/${observedUserId}/enrollments?per_page=100&state[]=active`,
          canvasToken,
          canvasDomain
        );
        for (const enrollment of studentEnrollments) {
          if (enrollment.type === "StudentEnrollment" && enrollment.course_id) {
            gradeMap.set(enrollment.course_id, {
              grade: enrollment.computed_current_grade ?? enrollment.grades?.current_grade ?? null,
              score: enrollment.computed_current_score ?? enrollment.grades?.current_score ?? null,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching observed student enrollments:", error);
      }
    }

    // If no associated_user_id, try fetching grades from each course directly
    if (gradeMap.size === 0) {
      await Promise.all(
        courses.map(async (course) => {
          try {
            const enrollments: any[] = await canvasFetch(
              `/courses/${course.id}/enrollments?per_page=100`,
              canvasToken,
              canvasDomain
            );
            const studentEnrollment = enrollments.find(
              (e: any) => e.type === "StudentEnrollment"
            );
            if (studentEnrollment) {
              gradeMap.set(course.id, {
                grade: studentEnrollment.computed_current_grade ?? studentEnrollment.grades?.current_grade ?? null,
                score: studentEnrollment.computed_current_score ?? studentEnrollment.grades?.current_score ?? null,
              });
            }
          } catch (error) {
            console.error(`Error fetching enrollments for course ${course.id}:`, error);
          }
        })
      );
    }
  } else {
    // Regular student account — use own enrollments
    for (const enrollment of allEnrollments) {
      if (enrollment.type === "StudentEnrollment" && enrollment.course_id) {
        gradeMap.set(enrollment.course_id, {
          grade: enrollment.computed_current_grade ?? enrollment.grades?.current_grade ?? null,
          score: enrollment.computed_current_score ?? enrollment.grades?.current_score ?? null,
        });
      }
    }
  }

  const coursesWithGrades: CanvasCourseWithGrades[] = courses.map((course) => {
    const gradeInfo = gradeMap.get(course.id);
    return {
      id: course.id,
      name: course.name,
      course_code: course.course_code || course.name,
      html_url: `https://${canvasDomain}/courses/${course.id}`,
      current_grade: gradeInfo?.grade ?? null,
      current_score: gradeInfo?.score ?? null,
    };
  });

  return { assignments: allAssignments, courses: coursesWithGrades };
}

export interface CanvasCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  location_name?: string;
  html_url: string;
  context_code: string; // e.g. "course_12345" or "user_12345"
  context_name?: string;
}

export async function fetchCanvasCalendarEvents(): Promise<CanvasCalendarEvent[]> {
  const settings = await getCanvasSettings();
  if (!settings) {
    throw new Error("Canvas credentials not configured.");
  }

  const { canvasDomain, canvasToken } = settings;

  // Fetch calendar events for the next 3 months and past 1 week
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 3);

  const params = new URLSearchParams({
    type: "event",
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    per_page: "100",
  });

  try {
    const events: any[] = await canvasFetch(
      `/calendar_events?${params.toString()}`,
      canvasToken,
      canvasDomain
    );

    return events.map((e) => ({
      id: `canvas-event-${e.id}`,
      title: e.title,
      description: e.description,
      start_at: e.start_at,
      end_at: e.end_at,
      location_name: e.location_name,
      html_url: e.html_url,
      context_code: e.context_code,
      context_name: e.context_name,
    }));
  } catch (error) {
    console.error("Error fetching Canvas calendar events:", error);
    return [];
  }
}
