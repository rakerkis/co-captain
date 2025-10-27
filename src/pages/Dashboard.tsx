import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, AlertCircle, CheckCircle } from "lucide-react";
import AssignmentCard, { Assignment } from "@/components/AssignmentCard";
import CalendarView from "@/components/CalendarView";
import AddAssignmentDialog from "@/components/AddAssignmentDialog";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: "1",
      title: "Calculus Problem Set Ch. 5",
      subject: "Math",
      dueDate: new Date(2025, 9, 30),
      description: "Complete problems 1-25",
      completed: false,
    },
    {
      id: "2",
      title: "Essay on Climate Change",
      subject: "English",
      dueDate: new Date(2025, 10, 2),
      description: "1500 words minimum",
      completed: false,
    },
    {
      id: "3",
      title: "Chemistry Lab Report",
      subject: "Science",
      dueDate: new Date(2025, 9, 28),
      description: "Acid-base titration experiment",
      completed: false,
    },
    {
      id: "4",
      title: "World War II Presentation",
      subject: "History",
      dueDate: new Date(2025, 10, 5),
      description: "15-minute group presentation",
      completed: false,
    },
  ]);

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
    setAssignments([...assignments, newAssignment]);
  };

  const handleToggleComplete = (id: string) => {
    setAssignments(
      assignments.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const handleDelete = (id: string) => {
    setAssignments(assignments.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your assignments and stay on top of deadlines
            </p>
          </div>
          <AddAssignmentDialog onAdd={handleAddAssignment} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Assignments */}
          <div className="lg:col-span-1 space-y-4">
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

          {/* Calendar */}
          <div className="lg:col-span-2">
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
