import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCanvasAssignments = () => {
  return useQuery({
    queryKey: ["canvas-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("canvas-assignments");
      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // 5 minutes
  });
};

export const useCanvasCalendar = () => {
  return useQuery({
    queryKey: ["canvas-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("canvas-calendar");
      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // 5 minutes
  });
};

export const useCanvasFiles = () => {
  return useQuery({
    queryKey: ["canvas-files"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("canvas-files");
      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // 5 minutes
  });
};
