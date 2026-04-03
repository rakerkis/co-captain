import { useQuery } from "@tanstack/react-query";
import { fetchCanvasData } from "@/integrations/canvasApi";

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  html_url: string;
  current_grade?: string | null;
  current_score?: number | null;
}

export const useCanvasCourses = () => {
  return useQuery({
    queryKey: ["canvas-courses"],
    queryFn: async () => {
      const { courses } = await fetchCanvasData();
      return courses;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
