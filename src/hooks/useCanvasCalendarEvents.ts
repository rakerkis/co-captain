import { useQuery } from "@tanstack/react-query";
import { fetchCanvasCalendarEvents, type CanvasCalendarEvent } from "@/integrations/canvasApi";

export type { CanvasCalendarEvent };

export const useCanvasCalendarEvents = () => {
  return useQuery({
    queryKey: ["canvas-calendar-events"],
    queryFn: fetchCanvasCalendarEvents,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
