import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCanvasAssignments, useToggleAssignment } from "@/hooks/useCanvasAssignments";
import { format, isPast, isFuture } from "date-fns";
import { ExternalLink, Loader2 } from "lucide-react";

const Assignments = () => {
  const { data, isLoading } = useCanvasAssignments();
  const toggleAssignment = useToggleAssignment();

  const handleToggleAssignment = (assignmentId: number, currentStatus: boolean) => {
    toggleAssignment.mutate({
      assignmentId,
      completed: !currentStatus,
    });
  };

  const assignments = data?.assignments || [];

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

  const sortedAssignments = [...assignments].sort((a, b) => {
    // Sort by completion status first (incomplete first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Then sort by due date
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">All Assignments</h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No assignments found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedAssignments.map((assignment) => {
              const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
              const isOverdue = dueDate && isPast(dueDate);
              const isUpcoming = dueDate && isFuture(dueDate);

              return (
                <Card
                  key={assignment.id}
                  className={`transition-all hover:shadow-md ${
                    isOverdue ? "border-destructive/50" : ""
                  }`}
                >
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
                            <h3 className={`font-semibold text-lg truncate ${assignment.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {assignment.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {assignment.course_name} ({assignment.course_code})
                            </p>
                          </div>
                          <Badge
                            className={`${getPriorityColor(
                              assignment.priority
                            )} text-white shrink-0`}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assignments;
