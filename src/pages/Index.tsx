import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCanvasAssignments,
  useToggleAssignment,
} from "@/hooks/useCanvasAssignments";
import {
  useCustomAssignments,
  useToggleCustomAssignment,
} from "@/hooks/useCustomAssignments";
import {
  useGoogleCalendarEvents,
} from "@/hooks/useGoogleCalendar";
import { useCanvasCalendarEvents } from "@/hooks/useCanvasCalendarEvents";
import { useHiddenCourses } from "@/hooks/useHiddenCourses";
import { Badge } from "@/components/ui/badge";
import {
  format,
  isPast,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  getDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ChevronDown,
  Check,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlatform } from "@/hooks/use-platform";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
  isCanvasEvent: boolean;
  description?: string;
};

type ViewMode = "day" | "week" | "month" | "schedule";

const Index = () => {
  const { data } = useCanvasAssignments();
  const toggleAssignment = useToggleAssignment();
  const { data: customAssignments } = useCustomAssignments();
  const toggleCustomAssignment = useToggleCustomAssignment();
  const { data: googleCalendarData } = useGoogleCalendarEvents();
  const { data: canvasCalendarEvents } = useCanvasCalendarEvents();
  const { hiddenCalendarIds } = useHiddenCourses();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<CombinedAssignment | null>(
    null,
  );
  const { isNative } = usePlatform();

  const canvasAssignments = data?.assignments || [];
  const customAssignmentsList = customAssignments || [];
  const googleEvents = googleCalendarData?.events || [];
  const canvasEvents = canvasCalendarEvents || [];

  // Combine Canvas assignments, Canvas calendar events, custom assignments, and Google Calendar events
  const allAssignments: CombinedAssignment[] = useMemo(() => {
    const canvas = canvasAssignments
      .filter((a: any) => !hiddenCalendarIds.includes(a.course_id))
      .map((a: any) => ({
        ...a,
        course_id: a.course_id,
        isCustom: false,
        isGoogleEvent: false,
        isCanvasEvent: false,
      }));
    const canvasCal = canvasEvents.map((event) => ({
      id: event.id,
      name: event.title,
      due_at: event.start_at,
      course_name: event.context_name || "Canvas Calendar",
      course_code: "",
      course_id: event.context_code || "canvas-calendar",
      priority: "medium" as const,
      html_url: event.html_url,
      completed: false,
      isCustom: false,
      isGoogleEvent: false,
      isCanvasEvent: true,
      description: event.description,
    }));
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
      isCanvasEvent: false,
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
      isCanvasEvent: false,
      description: event.description,
    }));
    return [...canvas, ...canvasCal, ...custom, ...google];
  }, [
    canvasAssignments,
    canvasEvents,
    customAssignmentsList,
    googleEvents,
    hiddenCalendarIds,
  ]);

  // Get assignments for a specific date
  const getAssignmentsForDate = (date: Date) => {
    return allAssignments.filter((a) => {
      if (!a.due_at) return false;
      return isSameDay(new Date(a.due_at), date);
    });
  };

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
    if (assignment.isGoogleEvent || assignment.isCanvasEvent) return;
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

  const navigatePrev = () => {
    if (viewMode === "month") setSelectedDate(subMonths(selectedDate, 1));
    else if (viewMode === "week") setSelectedDate(subWeeks(selectedDate, 1));
    else setSelectedDate(addDays(selectedDate, -1));
  };

  const navigateNext = () => {
    if (viewMode === "month") setSelectedDate(addMonths(selectedDate, 1));
    else if (viewMode === "week") setSelectedDate(addWeeks(selectedDate, 1));
    else setSelectedDate(addDays(selectedDate, 1));
  };

  const goToToday = () => setSelectedDate(new Date());

  // Generate month grid
  const monthDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const startWeekDay = getDay(start);
    const days: Date[] = [];
    // Fill leading days from previous month
    for (let i = startWeekDay; i > 0; i--) {
      days.push(addDays(start, -i));
    }
    // Fill current month
    let current = start;
    while (current <= end) {
      days.push(current);
      current = addDays(current, 1);
    }
    // Fill trailing days to complete the grid (6 rows)
    let trailing = 1;
    while (days.length < 42) {
      days.push(addDays(end, trailing));
      trailing++;
    }
    return days;
  }, [selectedDate]);

  // Generate week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Render event detail view
  const renderEventDetail = () => {
    if (!selectedEvent) return null;
    const dueDate = selectedEvent.due_at
      ? new Date(selectedEvent.due_at)
      : null;
    const isOverdue = dueDate && isPast(dueDate);

    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                {getSourceIcon(selectedEvent) ? (
                  <div className="mt-1 shrink-0 [&>img]:w-5 [&>img]:h-5">
                    {getSourceIcon(selectedEvent)}
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full mt-1 shrink-0 ${getCourseColor(selectedEvent.course_id || "default")}`}
                  />
                )}
                <div className="flex-1">
                  <h2
                    className={`text-2xl font-bold ${selectedEvent.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {selectedEvent.name}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {selectedEvent.course_name}
                  </p>
                </div>
                <Badge
                  className={`${getPriorityColor(selectedEvent.priority)} text-white`}
                >
                  {selectedEvent.priority}
                </Badge>
              </div>

              {dueDate && (
                <div
                  className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                >
                  Due: {format(dueDate, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  {isOverdue && " (Overdue)"}
                </div>
              )}

              {selectedEvent.description && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 border-t pt-4">
                {!selectedEvent.isGoogleEvent &&
                  !selectedEvent.isCanvasEvent && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedEvent.completed || false}
                        onCheckedChange={() =>
                          handleToggleAssignment(selectedEvent)
                        }
                      />
                      <span className="text-sm">
                        {selectedEvent.completed
                          ? "Completed"
                          : "Mark as complete"}
                      </span>
                    </div>
                  )}
                {selectedEvent.html_url && (
                  <a
                    href={selectedEvent.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    {selectedEvent.isGoogleEvent
                      ? "Open in Google Calendar"
                      : "View in Canvas"}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Source icon for event
  const getSourceIcon = (assignment: CombinedAssignment) => {
    if (assignment.isGoogleEvent) {
      return (
        <img
          src="/google-calendar-icon.svg"
          alt=""
          className="w-3.5 h-3.5 shrink-0 rounded-[2px]"
        />
      );
    }
    if (!assignment.isCustom) {
      return (
        <img
          src="/canvas-icon.svg"
          alt=""
          className="w-3.5 h-3.5 shrink-0 rounded-[2px]"
        />
      );
    }
    return null;
  };

  // Render an event pill
  const renderEventPill = (assignment: CombinedAssignment, compact = false) => (
    <button
      key={assignment.id}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedEvent(assignment);
      }}
      className={`${getCourseColor(assignment.course_id || "default")} text-white text-[10px] px-1.5 py-0.5 rounded overflow-hidden text-ellipsis whitespace-nowrap max-w-full text-left w-full hover:opacity-80 transition-opacity flex items-center gap-1`}
    >
      {getSourceIcon(assignment)}
      <span className="overflow-hidden text-ellipsis">
        {compact && assignment.due_at
          ? `${format(new Date(assignment.due_at), "h:mm a")} `
          : ""}
        {assignment.name}
      </span>
    </button>
  );

  // Month view cell
  const renderMonthCell = (date: Date) => {
    const dayAssignments = getAssignmentsForDate(date);
    const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
    const isToday = isSameDay(date, new Date());

    return (
      <div
        key={date.toISOString()}
        className={`border border-border p-1 min-h-[90px] cursor-pointer hover:bg-accent/50 transition-colors ${
          !isCurrentMonth ? "opacity-40" : ""
        } ${isToday ? "bg-accent" : ""}`}
        onClick={() => {
          setSelectedDate(date);
          if (dayAssignments.length > 0) {
            setViewMode("day");
          }
        }}
      >
        <span
          className={`text-sm font-medium ${isToday ? "text-primary font-bold" : ""}`}
        >
          {format(date, "d")}
        </span>
        <div className="flex flex-col gap-0.5 mt-0.5">
          {dayAssignments.slice(0, 2).map((a) => renderEventPill(a))}
          {dayAssignments.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{dayAssignments.length - 2} more
            </span>
          )}
        </div>
      </div>
    );
  };

  // Week view
  const renderWeekView = () => (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header row */}
      <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
        <div className="p-2 text-xs text-muted-foreground border-r" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-r ${isSameDay(day, new Date()) ? "bg-accent" : ""}`}
          >
            <div className="text-xs text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={`text-lg font-semibold ${isSameDay(day, new Date()) ? "text-primary" : ""}`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
      {/* All-day events */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-1 text-[10px] text-muted-foreground border-r">
          All day
        </div>
        {weekDays.map((day) => {
          const dayEvents = getAssignmentsForDate(day).filter(
            (a) => a.due_at && !new Date(a.due_at).getHours(),
          );
          return (
            <div key={day.toISOString()} className="p-1 border-r min-h-[30px]">
              {dayEvents.map((a) => renderEventPill(a))}
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      {hours.map((hour) => (
        <div key={hour} className="grid grid-cols-8 border-b min-h-[50px]">
          <div className="p-1 text-[10px] text-muted-foreground border-r text-right pr-2">
            {format(new Date(2000, 0, 1, hour), "h a")}
          </div>
          {weekDays.map((day) => {
            const dayEvents = getAssignmentsForDate(day).filter((a) => {
              if (!a.due_at) return false;
              const d = new Date(a.due_at);
              return d.getHours() === hour;
            });
            return (
              <div key={day.toISOString()} className="p-0.5 border-r">
                {dayEvents.map((a) => renderEventPill(a, true))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // Day view
  const renderDayView = () => {
    const dayAssignments = getAssignmentsForDate(selectedDate);
    return (
      <div className="flex flex-col h-full overflow-auto">
        {/* All-day events */}
        {dayAssignments.filter(
          (a) => a.due_at && !new Date(a.due_at!).getHours(),
        ).length > 0 && (
          <div className="border-b p-2">
            <div className="text-xs text-muted-foreground mb-1">All day</div>
            <div className="flex flex-col gap-1">
              {dayAssignments
                .filter((a) => a.due_at && !new Date(a.due_at!).getHours())
                .map((a) => renderEventPill(a))}
            </div>
          </div>
        )}
        {/* Time grid */}
        {hours.map((hour) => {
          const hourEvents = dayAssignments.filter((a) => {
            if (!a.due_at) return false;
            return new Date(a.due_at).getHours() === hour;
          });
          return (
            <div key={hour} className="flex border-b min-h-[50px]">
              <div className="w-20 p-2 text-xs text-muted-foreground text-right pr-3 border-r shrink-0">
                {format(new Date(2000, 0, 1, hour), "h a")}
              </div>
              <div className="flex-1 p-1">
                {hourEvents.map((a) => renderEventPill(a, true))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Schedule view
  const renderScheduleView = () => {
    const upcomingAssignments = allAssignments
      .filter((a) => a.due_at)
      .sort(
        (a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime(),
      );

    // Group by date
    const grouped: Record<string, CombinedAssignment[]> = {};
    for (const a of upcomingAssignments) {
      const key = format(new Date(a.due_at!), "yyyy-MM-dd");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    }

    const sortedDates = Object.keys(grouped).sort();

    if (sortedDates.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No upcoming events
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-auto">
        {sortedDates.map((dateKey) => {
          const date = new Date(dateKey + "T00:00:00");
          const events = grouped[dateKey];
          const isToday = isSameDay(date, new Date());
          return (
            <div key={dateKey} className="border-b last:border-b-0">
              <div
                className={`flex items-baseline gap-3 px-4 py-3 ${isToday ? "bg-accent/50" : ""}`}
              >
                <span
                  className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}
                >
                  {format(date, "d")}
                </span>
                <span className="text-sm text-muted-foreground uppercase">
                  {format(date, "EEE, MMM")}
                </span>
              </div>
              <div className="divide-y">
                {events.map((event) => {
                  const eventDate = event.due_at
                    ? new Date(event.due_at)
                    : null;
                  const hasTime = eventDate && eventDate.getHours() !== 0;
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent/30 transition-colors text-left"
                    >
                      {getSourceIcon(event) || (
                        <div
                          className={`w-3.5 h-3.5 rounded-full shrink-0 ${getCourseColor(event.course_id || "default")}`}
                        />
                      )}
                      <div className="w-24 shrink-0 text-sm text-muted-foreground">
                        {hasTime ? format(eventDate!, "h:mm – ") : ""}
                        {hasTime && eventDate
                          ? format(
                              new Date(eventDate.getTime() + 3600000),
                              "h:mma",
                            )
                          : "All day"}
                      </div>
                      <span
                        className={`text-sm font-medium flex-1 ${event.completed ? "line-through text-muted-foreground" : ""}`}
                      >
                        {event.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Header label
  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(selectedDate, "MMMM yyyy");
    if (viewMode === "week") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return `${format(start, "MMM d")} \u2013 ${format(end, "MMM d, yyyy")}`;
    }
    if (viewMode === "schedule") return "Schedule";
    return format(selectedDate, "EEEE, MMMM d, yyyy");
  }, [selectedDate, viewMode]);

  if (selectedEvent) {
    return renderEventDetail();
  }

  return (
    <div className="p-6 h-[calc(100vh-2rem)]">
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Calendar
              <span className="text-xs font-normal text-muted-foreground ml-1">v23</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* View mode toggle — dropdown on native, button row on web */}
              {isNative ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs capitalize gap-1"
                    >
                      {viewMode}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["schedule", "day", "week", "month"] as ViewMode[]).map(
                      (mode) => (
                        <DropdownMenuItem
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className="capitalize gap-2"
                        >
                          {viewMode === mode && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span
                            className={viewMode === mode ? "" : "pl-[18px]"}
                          >
                            {mode}
                          </span>
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex rounded-md border">
                  {(["schedule", "day", "week", "month"] as ViewMode[]).map(
                    (mode) => (
                      <Button
                        key={mode}
                        variant={viewMode === mode ? "default" : "ghost"}
                        size="sm"
                        className="text-xs capitalize rounded-none first:rounded-l-md last:rounded-r-md"
                        onClick={() => setViewMode(mode)}
                      >
                        {mode}
                      </Button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Navigation */}
          <div className="flex items-center gap-3 mt-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={navigatePrev}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={navigateNext}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-lg font-semibold">{headerLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-4">
          {viewMode === "month" && (
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-7 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {monthDays.map((date) => renderMonthCell(date))}
              </div>
            </div>
          )}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
          {viewMode === "schedule" && renderScheduleView()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;