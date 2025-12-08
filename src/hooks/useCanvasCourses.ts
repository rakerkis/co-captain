import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase.functions.invoke("fetch-canvas-assignments");
      
      if (error) throw error;
      
      return data?.courses || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
