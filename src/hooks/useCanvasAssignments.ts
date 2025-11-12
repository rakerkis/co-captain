import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  course_name: string;
  course_code: string;
  priority: "high" | "medium" | "low";
  html_url: string;
}

export const useCanvasAssignments = () => {
  return useQuery({
    queryKey: ["canvas-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-canvas-assignments");
      
      if (error) throw error;
      return data as { assignments: CanvasAssignment[] };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
