import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useCanvasAssignments, useToggleAssignment } from "@/hooks/useCanvasAssignments";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, startOfDay, isPast } from "date-fns";
import { ClipboardList, AlertCircle, Calendar as CalendarIcon, ExternalLink } from "lucide-react";
import { useState } from "react";
import TodoList from "@/components/TodoList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const Index = () => {
  const { data, isLoading } = useCanvasAssignments();
  const toggleAssignment = useToggleAssignment();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);

  const assignments = data?.assignments || [];

  // Stats
  const totalAssignments = assignments.length;
  const upcomingAssignments = assignments.filter(
    (a) => a.due_at && new Date(a.due_at) >= new Date()
  ).length;
  const overdueAssignments = assignments.filter(
    (a) => a.due_at && new Date(a.due_at) < new Date()
  ).length;

  // Get assignments for selected date
  const selectedAssignments = selectedDate
    ? assignments.filter((a) => {
        if (!a.due_at) return false;
        const dueDate = startOfDay(new Date(a.due_at));
        const selected = startOfDay(selectedDate);
        return dueDate.getTime() === selected.getTime();
      })
    : [];

  // Get dates with assignments
  const datesWithAssignments = assignments
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

  const handleToggleAssignment = (assignmentId: number, currentStatus: boolean) => {
    toggleAssignment.mutate({
      assignmentId,
      completed: !currentStatus,
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayAssignments = assignments.filter((a) => {
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
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assignments
              </CardTitle>
              <ClipboardList className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalAssignments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming
              </CardTitle>
              <CalendarIcon className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{upcomingAssignments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{overdueAssignments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and To-Do List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                <CardTitle>
                  {selectedDate ? format(selectedDate, "MMMM yyyy") : format(new Date(), "MMMM yyyy")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full h-full pointer-events-auto [&_.rdp-month]:w-full [&_.rdp-month]:h-full [&_.rdp-table]:w-full [&_.rdp-table]:h-full [&_.rdp-tbody]:h-full [&_.rdp-cell]:p-0 [&_.rdp-cell]:h-full [&_.rdp-day]:min-h-32 [&_.rdp-day]:w-full [&_.rdp-day]:rounded-xl [&_.rdp-day]:border [&_.rdp-day]:border-border [&_.rdp-day]:flex [&_.rdp-day]:flex-col [&_.rdp-day]:items-start [&_.rdp-day]:justify-start [&_.rdp-day]:p-2 [&_.rdp-day_button]:w-full [&_.rdp-day_button]:h-full [&_.rdp-day_button]:flex [&_.rdp-day_button]:flex-col [&_.rdp-day_button]:items-start [&_.rdp-day_button]:justify-start [&_.rdp-day_button]:p-2"
                modifiers={{
                  hasAssignment: datesWithAssignments,
                }}
                modifiersClassNames={{
                  hasAssignment: "relative after:content-[''] after:absolute after:bottom-2 after:left-2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
                  selected: "bg-primary text-primary-foreground border-primary",
                }}
                components={{
                  Day: ({ date, ...props }) => {
                    const dayAssignments = assignments.filter((a) => {
                      if (!a.due_at) return false;
                      const dueDate = startOfDay(new Date(a.due_at));
                      const currentDate = startOfDay(date);
                      return dueDate.getTime() === currentDate.getTime();
                    });
                    
                    return (
                      <div className="relative w-full h-full">
                        <button
                          {...props}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateClick(date);
                          }}
                          className="w-full h-full flex flex-col items-start justify-start p-2 rounded-xl hover:bg-accent transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-medium">{format(date, "d")}</span>
                          {dayAssignments.length > 0 && (
                            <span className="text-xs text-muted-foreground mt-auto truncate w-full">
                              {dayAssignments[0].course_name?.slice(0, 6)}...
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* To-Do List */}
          <div>
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
                          <Checkbox
                            checked={assignment.completed || false}
                            onCheckedChange={() =>
                              handleToggleAssignment(assignment.id, assignment.completed || false)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold text-lg ${assignment.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                  {assignment.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {assignment.course_name} ({assignment.course_code})
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
                              {assignment.html_url && (
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
