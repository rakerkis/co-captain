import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useCanvasAssignments, useToggleAssignment, type CanvasAssignment } from "@/hooks/useCanvasAssignments";
import { useCustomAssignments, useToggleCustomAssignment, type CustomAssignment } from "@/hooks/useCustomAssignments";
import { useGoogleCalendarEvents, useGoogleCalendarAuth, useGoogleCalendarDisconnect, type GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { useHiddenCourses } from "@/hooks/useHiddenCourses";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, isPast } from "date-fns";
import { Calendar as CalendarIcon, ExternalLink, Trash2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import TodoList from "@/components/TodoList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCourseColor } from "@/lib/courseColors";

type CombinedAssignment = {
  id: string | number;
  name: string;
  due_at: string | null | undefined;
  course_name: string;
  course_code: string;
  course_id?: number | string;
  priority: string;
  html_url: string;
  completed: boolean;
  isCustom: boolean;
  isGoogleEvent: boolean;
  description?: string;
};

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const { data, isLoading } = useCanvasAssignments();
  const toggleAssignment = useToggleAssignment();
  const { data: customAssignments } = useCustomAssignments();
  const toggleCustomAssignment = useToggleCustomAssignment();
  const { data: googleCalendarData } = useGoogleCalendarEvents();
  const googleCalendarAuth = useGoogleCalendarAuth();
  const googleCalendarDisconnect = useGoogleCalendarDisconnect();
  const { hiddenCalendarIds } = useHiddenCourses();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const canvasAssignments = data?.assignments || [];
  const customAssignmentsList = customAssignments || [];
  const googleEvents = googleCalendarData?.events || [];
  const isGoogleConnected = googleCalendarData?.isConnected || false;

  // Combine Canvas, custom assignments, and Google Calendar events (filter hidden courses)
  const allAssignments: CombinedAssignment[] = useMemo(() => {
    const canvas = canvasAssignments
      .filter((a: any) => !hiddenCalendarIds.includes(a.course_id))
      .map((a: any) => ({ ...a, course_id: a.course_id, isCustom: false, isGoogleEvent: false }));
    const custom = customAssignmentsList.map((a) => ({
      ...a,
      id: a.id,
      name: a.name,
      due_at: a.due_at,
      course_name: a.course_name || "",
      course_code: "",
      course_id: `custom-${a.id}`,
      priority: a.priority,
      html_url: "",
      completed: a.completed,
      isCustom: true,
      isGoogleEvent: false,
    }));
    const google = googleEvents.map((event) => ({
      id: event.id,
      name: event.summary,
      due_at: event.start.dateTime || event.start.date,
      course_name: "Google Calendar",
      course_code: "",
      course_id: "google-calendar",
      priority: "medium" as const,
      html_url: event.htmlLink || "",
      completed: false,
      isCustom: false,
      isGoogleEvent: true,
      description: event.description,
    }));
    return [...canvas, ...custom, ...google];
  }, [canvasAssignments, customAssignmentsList, googleEvents, hiddenCalendarIds]);

  // Get assignments for selected date
  const selectedAssignments = selectedDate
    ? allAssignments.filter((a) => {
        if (!a.due_at) return false;
        const dueDate = startOfDay(new Date(a.due_at));
        const selected = startOfDay(selectedDate);
        return dueDate.getTime() === selected.getTime();
      })
    : [];

  // Get dates with assignments
  const datesWithAssignments = allAssignments
    .filter((a) => a.due_at)
    .map((a) => startOfDay(new Date(a.due_at!)));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-muted";
    }
  };

  const handleToggleAssignment = (assignment: CombinedAssignment) => {
    if (assignment.isGoogleEvent) {
      // Google Calendar events can't be marked as complete
      return;
    }
    if (assignment.isCustom) {
      toggleCustomAssignment.mutate({
        id: assignment.id as string,
        completed: !assignment.completed,
      });
    } else {
      toggleAssignment.mutate({
        assignmentId: assignment.id as number,
        completed: !assignment.completed || false,
      });
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayAssignments = allAssignments.filter((a) => {
      if (!a.due_at) return false;
      const dueDate = startOfDay(new Date(a.due_at));
      const currentDate = startOfDay(date);
      return dueDate.getTime() === currentDate.getTime();
    });
    if (dayAssignments.length > 0) {
      setDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 h-[calc(100vh-3rem)]">
        {/* Calendar and To-Do List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Calendar */}
          <Card className="lg:col-span-2 flex flex-col h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Assignment Calendar
                </CardTitle>
                <div className="flex gap-2">
                  {session ? (
                    isGoogleConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => googleCalendarDisconnect.mutate()}
                      >
                        Disconnect Google
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => googleCalendarAuth.mutate()}
                      >
                        Connect Google Calendar
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href="/auth">Login to Connect Calendar</a>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center overflow-hidden p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full h-full pointer-events-auto flex flex-col"
                classNames={{
                  months: "flex flex-col h-full w-full",
                  month: "flex flex-col h-full w-full space-y-4",
                  caption: "flex justify-center pt-1 relative items-center mb-4",
                  caption_label: "text-lg font-semibold",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-9 w-9 bg-transparent hover:bg-accent rounded-lg",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse flex-1",
                  head_row: "flex w-full mb-2",
                  head_cell: "text-muted-foreground rounded-md w-full font-medium text-sm flex-1 text-center",
                  row: "flex w-full mt-2 flex-1",
                  cell: "relative p-0 text-center flex-1 focus-within:relative focus-within:z-20",
                  day: "h-full w-full p-0 font-normal aria-selected:opacity-100 rounded-2xl border border-border hover:bg-accent transition-colors",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_hidden: "invisible",
                }}
                components={{
                  Day: ({ date, ...props }) => {
                    const dayAssignments = allAssignments.filter((a) => {
                      if (!a.due_at) return false;
                      const dueDate = startOfDay(new Date(a.due_at));
                      const currentDate = startOfDay(date);
                      return dueDate.getTime() === currentDate.getTime();
                    });
                    
                    const isSelected = selectedDate && startOfDay(date).getTime() === startOfDay(selectedDate).getTime();
                    
                    // Get unique course colors for this day (max 4)
                    const uniqueCourseIds = [...new Set(dayAssignments.map(a => a.course_id))].slice(0, 4);
                    
                    return (
                      <button
                        {...props}
                        onClick={(e) => {
                          e.preventDefault();
                          handleDateClick(date);
                        }}
                        className={`w-full h-full min-h-[80px] flex flex-col items-start justify-start p-2 rounded-2xl border transition-colors ${
                          isSelected 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        <span className="text-base font-medium mb-1">{format(date, "d")}</span>
                        {dayAssignments.length > 0 && (
                          <div className="flex flex-col gap-0.5 w-full overflow-hidden flex-1">
                            {dayAssignments.slice(0, 3).map((assignment) => (
                              <div
                                key={assignment.id}
                                className={`${getCourseColor(assignment.course_id || 'default')} text-white text-[10px] px-1.5 py-0.5 rounded truncate w-full text-left`}
                              >
                                {assignment.name}
                              </div>
                            ))}
                            {dayAssignments.length > 3 && (
                              <span className={`text-[10px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                +{dayAssignments.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* To-Do List */}
          <div className="h-full overflow-auto">
            <TodoList />
          </div>
        </div>

        {/* Assignment Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Assignments for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {selectedAssignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No assignments for this date</p>
              ) : (
                selectedAssignments.map((assignment) => {
                  const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
                  const isOverdue = dueDate && isPast(dueDate);
                  
                  return (
                    <Card key={assignment.id} className={isOverdue ? "border-destructive/50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {!assignment.isGoogleEvent && (
                            <Checkbox
                              checked={assignment.completed || false}
                              onCheckedChange={() => handleToggleAssignment(assignment)}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-2">
                              <div
                                className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${getCourseColor(assignment.course_id || 'default')}`}
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold text-lg ${assignment.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                  {assignment.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {assignment.course_name}
                                  {!assignment.isCustom && 'course_code' in assignment && assignment.course_code && ` (${assignment.course_code})`}
                                </p>
                              </div>
                              <Badge
                                className={`${getPriorityColor(assignment.priority)} text-white shrink-0`}
                              >
                                {assignment.priority}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              {dueDate && (
                                <div
                                  className={`${
                                    isOverdue
                                      ? "text-destructive font-medium"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  Due: {format(dueDate, "MMM d, yyyy 'at' h:mm a")}
                                  {isOverdue && " (Overdue)"}
                                </div>
                              )}
                              {!assignment.isCustom && 'html_url' in assignment && assignment.html_url && (
                                <a
                                  href={assignment.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  View in Canvas
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
