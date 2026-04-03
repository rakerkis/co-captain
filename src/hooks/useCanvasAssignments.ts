import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subWeeks } from "date-fns";
import { fetchCanvasData } from "@/integrations/canvasApi";

export interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  course_name: string;
  course_code: string;
  course_id?: number;
  priority: "high" | "medium" | "low";
  html_url: string;
  completed?: boolean;
}

export const useCanvasAssignments = () => {
  return useQuery({
    queryKey: ["canvas-assignments"],
    queryFn: async () => {
      const { assignments } = await fetchCanvasData();
      
      // Filter out assignments older than 1 week past due date
      const oneWeekAgo = subWeeks(new Date(), 1);
      const recentAssignments = assignments.filter((a) => {
        if (!a.due_at) return true;
        const dueDate = new Date(a.due_at);
        return dueDate >= oneWeekAgo;
      });

      // Fetch completion status from Supabase
      const { data: completions } = await supabase
        .from("assignment_completions")
        .select("assignment_id, completed");

      const completionMap = new Map(
        completions?.map((c) => [c.assignment_id, c.completed]) || []
      );

      // Merge completion status with assignments
      const assignmentsWithStatus = recentAssignments.map((a) => ({
        ...a,
        completed: completionMap.get(a.id.toString()) || false,
      }));

      // Filter out completed assignments
      const filteredAssignments = assignmentsWithStatus.filter((a) => !a.completed);

      return { assignments: filteredAssignments };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

export const useToggleAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, completed }: { assignmentId: number; completed: boolean }) => {
      const { data: existing } = await supabase
        .from("assignment_completions")
        .select("*")
        .eq("assignment_id", assignmentId.toString())
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("assignment_completions")
          .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .eq("assignment_id", assignmentId.toString());

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("assignment_completions")
          .insert({
            assignment_id: assignmentId.toString(),
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canvas-assignments"] });
    },
  });
};
