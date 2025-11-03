import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, AlertCircle, CheckCircle } from "lucide-react";
import AssignmentCard, { Assignment } from "@/components/AssignmentCard";
import CalendarView from "@/components/CalendarView";
import AddAssignmentDialog from "@/components/AddAssignmentDialog";
import { useNavigate } from "react-router-dom";
import { useCanvasAssignments } from "@/hooks/useCanvasData";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: canvasData } = useCanvasAssignments();
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);

  // Merge Canvas assignments with local assignments
  const assignments: Assignment[] = [
    ...(canvasData?.assignments?.map((ca: any) => ({
      id: `canvas-${ca.id}`,
      title: ca.name,
      subject: ca.course_name || "Canvas",
      dueDate: ca.due_at ? new Date(ca.due_at) : new Date(),
      description: "",
      completed: false,
    })) || []),
    ...localAssignments,
  ];

  const upcomingAssignments = assignments
    .filter((a) => !a.completed && a.dueDate >= new Date())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 3);

  const overdueCount = assignments.filter(
    (a) => !a.completed && a.dueDate < new Date()
  ).length;

  const completedCount = assignments.filter((a) => a.completed).length;
  const totalCount = assignments.length;

  const handleAddAssignment = (assignment: Omit<Assignment, "id">) => {
    const newAssignment: Assignment = {
      ...assignment,
      id: Date.now().toString(),
    };
    setLocalAssignments([...localAssignments, newAssignment]);
  };

  const handleToggleComplete = (id: string) => {
    // Only allow toggling local assignments, not Canvas ones
    if (!id.startsWith('canvas-')) {
      setLocalAssignments(
        localAssignments.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
      );
    }
  };

  const handleDelete = (id: string) => {
    // Only allow deleting local assignments, not Canvas ones
    if (!id.startsWith('canvas-')) {
      setLocalAssignments(localAssignments.filter((a) => a.id !== id));
    }
  };

  const [headerText, setHeaderText] = useState("My Dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        {/* Customizable Header */}
        <div className="mb-8 flex items-center justify-between">
          <input
            type="text"
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            className="text-4xl font-bold text-foreground bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 -mx-2"
            placeholder="Enter your header..."
          />
          <AddAssignmentDialog onAdd={handleAddAssignment} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* To-Do List with Stats */}
          <div className="space-y-4">
            {/* Stats Cards inside To-Do */}
            <div className="grid grid-cols-1 gap-3">
              <Card className="bg-gradient-to-br from-card to-accent/10 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Assignments
                  </CardTitle>
                  <ClipboardList className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{totalCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedCount} completed
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-orange-500/10 border-orange-500/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Due Soon
                  </CardTitle>
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {upcomingAssignments.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Next 7 days</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-destructive/10 border-destructive/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Overdue
                  </CardTitle>
                  <Calendar className="w-4 h-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{overdueCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Need attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Assignments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Upcoming</h2>
                <button
                  onClick={() => navigate("/assignments")}
                  className="text-sm text-primary hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {upcomingAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                  />
                ))}
                {upcomingAssignments.length === 0 && (
                  <Card className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground">All caught up!</p>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Calendar</h2>
            <CalendarView
              assignments={assignments}
              onDateClick={(date) => {
                navigate("/calendar");
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
