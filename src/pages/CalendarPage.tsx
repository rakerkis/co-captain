import { useState } from "react";
import { Assignment } from "@/components/AssignmentCard";
import CalendarView from "@/components/CalendarView";
import AddAssignmentDialog from "@/components/AddAssignmentDialog";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

const CalendarPage = () => {
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

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleAddAssignment = (assignment: Omit<Assignment, "id">) => {
    const newAssignment: Assignment = {
      ...assignment,
      id: Date.now().toString(),
    };
    setAssignments([...assignments, newAssignment]);
  };

  const selectedDateAssignments = selectedDate
    ? assignments.filter(
        (a) => format(a.dueDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
      )
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">
              View all your assignments in calendar format
            </p>
          </div>
          <AddAssignmentDialog onAdd={handleAddAssignment} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarView
              assignments={assignments}
              onDateClick={setSelectedDate}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              {selectedDate
                ? format(selectedDate, "MMMM dd, yyyy")
                : "Select a date"}
            </h2>
            {selectedDate ? (
              selectedDateAssignments.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateAssignments.map((assignment) => (
                    <Card key={assignment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-1 h-full rounded-full"
                            style={{
                              backgroundColor:
                                assignment.subject === "Math"
                                  ? "hsl(var(--subject-math))"
                                  : assignment.subject === "Science"
                                  ? "hsl(var(--subject-science))"
                                  : assignment.subject === "English"
                                  ? "hsl(var(--subject-english))"
                                  : assignment.subject === "History"
                                  ? "hsl(var(--subject-history))"
                                  : assignment.subject === "Art"
                                  ? "hsl(var(--subject-art))"
                                  : "hsl(var(--subject-other))",
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {assignment.subject}
                            </p>
                            {assignment.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {assignment.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">
                    No assignments due on this date
                  </p>
                </Card>
              )
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  Click on a date to view assignments
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
