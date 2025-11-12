import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useCanvasAssignments } from "@/hooks/useCanvasAssignments";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { ClipboardList, AlertCircle, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const { data, isLoading } = useCanvasAssignments();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

        {/* Calendar and Assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border pointer-events-auto"
                modifiers={{
                  hasAssignment: datesWithAssignments,
                }}
                modifiersStyles={{
                  hasAssignment: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Assignments for Selected Date */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? isToday(selectedDate)
                    ? "Today's Assignments"
                    : isTomorrow(selectedDate)
                    ? "Tomorrow's Assignments"
                    : `Assignments for ${format(selectedDate, "MMM d, yyyy")}`
                  : "Select a Date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : selectedAssignments.length > 0 ? (
                <div className="space-y-3">
                  {selectedAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {assignment.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">{assignment.course_name}</p>
                        </div>
                        <Badge
                          className={`${getPriorityColor(
                            assignment.priority
                          )} text-white shrink-0`}
                        >
                          {assignment.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground">No assignments for this date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
