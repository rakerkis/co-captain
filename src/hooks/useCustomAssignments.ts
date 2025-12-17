import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomAssignment {
  id: string;
  name: string;
  due_at: string | null;
  course_name: string | null;
  description: string | null;
  links: string | null;
  priority: "high" | "medium" | "low";
  type: "assignment" | "event";
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateCustomAssignmentInput {
  name: string;
  due_at: string | null;
  course_name: string | null;
  description: string | null;
  links: string | null;
  priority: "high" | "medium" | "low";
  type: "assignment" | "event";
}

export const useCustomAssignments = () => {
  return useQuery({
    queryKey: ["custom-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_assignments")
        .select("*")
        .order("due_at", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as CustomAssignment[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCustomAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomAssignmentInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("custom_assignments")
        .insert({
          ...input,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-assignments"] });
    },
  });
};

export const useToggleCustomAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("custom_assignments")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-assignments"] });
    },
  });
};

export const useDeleteCustomAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-assignments"] });
    },
  });
};
