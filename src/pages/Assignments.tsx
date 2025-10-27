import { useState } from "react";
import { Assignment } from "@/components/AssignmentCard";
import AssignmentCard from "@/components/AssignmentCard";
import AddAssignmentDialog from "@/components/AddAssignmentDialog";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

const Assignments = () => {
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
    {
      id: "5",
      title: "Physics Quiz Preparation",
      subject: "Science",
      dueDate: new Date(2025, 9, 27),
      description: "Chapters 1-3",
      completed: true,
    },
  ]);

  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [editingAssignment, setEditingAssignment] = useState<Assignment | undefined>();

  const subjects = ["all", ...new Set(assignments.map((a) => a.subject))];

  const filteredAssignments = assignments.filter((assignment) => {
    if (subjectFilter === "all") return true;
    return assignment.subject === subjectFilter;
  });

  const activeAssignments = filteredAssignments
    .filter((a) => !a.completed)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const completedAssignments = filteredAssignments
    .filter((a) => a.completed)
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());

  const handleAddAssignment = (assignment: Omit<Assignment, "id">) => {
    const newAssignment: Assignment = {
      ...assignment,
      id: Date.now().toString(),
    };
    setAssignments([...assignments, newAssignment]);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setAssignments(
      assignments.map((a) => (a.id === assignment.id ? assignment : a))
    );
    setEditingAssignment(undefined);
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
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Assignments</h1>
            <p className="text-muted-foreground">
              Manage all your school assignments in one place
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject === "all" ? "All Subjects" : subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddAssignmentDialog
              onAdd={handleAddAssignment}
              editingAssignment={editingAssignment}
              onEdit={handleEditAssignment}
            />
          </div>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="active">
              Active ({activeAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeAssignments.length > 0 ? (
              activeAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onEdit={setEditingAssignment}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                />
              ))
            ) : (
              <Card className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  All caught up!
                </h3>
                <p className="text-muted-foreground">
                  No active assignments. Great job staying on top of your work!
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedAssignments.length > 0 ? (
              completedAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onEdit={setEditingAssignment}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                />
              ))
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No completed assignments yet. Keep working!
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Assignments;
