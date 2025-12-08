import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Calendar } from "lucide-react";
import { useCanvasAssignments, useToggleAssignment } from "@/hooks/useCanvasAssignments";
import { useCustomAssignments, useCreateCustomAssignment, useToggleCustomAssignment, useDeleteCustomAssignment } from "@/hooks/useCustomAssignments";
import { useHiddenCourses } from "@/hooks/useHiddenCourses";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface CustomTodo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
  subject?: string;
  notes?: string;
}

const TodoList = () => {
  const { toast } = useToast();
  const { data, isLoading } = useCanvasAssignments();
  const toggleAssignment = useToggleAssignment();
  const { data: customAssignments, isLoading: customLoading } = useCustomAssignments();
  const createCustomAssignment = useCreateCustomAssignment();
  const toggleCustomAssignment = useToggleCustomAssignment();
  const deleteCustomAssignment = useDeleteCustomAssignment();
  const { hiddenAssignmentIds } = useHiddenCourses();
  
  const [customTodos, setCustomTodos] = useState<CustomTodo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Form state for custom tasks
  const [taskName, setTaskName] = useState("");
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(undefined);
  const [taskSubject, setTaskSubject] = useState("");
  const [taskNotes, setTaskNotes] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const assignments = data?.assignments || [];
  const upcomingAssignments = assignments
    .filter((a: any) => a.due_at && new Date(a.due_at) >= new Date() && !hiddenAssignmentIds.includes(a.course_id))
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 5);

  const handleToggleAssignment = (assignmentId: number, currentStatus: boolean) => {
    toggleAssignment.mutate({
      assignmentId,
      completed: !currentStatus,
    });
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      setCustomTodos([
        ...customTodos,
        {
          id: Date.now().toString(),
          text: newTodo,
          completed: false,
        },
      ]);
      setNewTodo("");
    }
  };

  const toggleTodo = (id: string) => {
    setCustomTodos(
      customTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setCustomTodos(customTodos.filter((todo) => todo.id !== id));
  };

  const handleCreateTask = () => {
    if (!taskName.trim()) return;

    setCustomTodos([
      ...customTodos,
      {
        id: Date.now().toString(),
        text: taskName,
        completed: false,
        dueDate: taskDueDate,
        subject: taskSubject || undefined,
        notes: taskNotes || undefined,
      },
    ]);

    setTaskName("");
    setTaskDueDate(undefined);
    setTaskSubject("");
    setTaskNotes("");
    setDialogOpen(false);
  };

  const handleToggleCustomAssignment = (id: string, currentStatus: boolean) => {
    toggleCustomAssignment.mutate({ id, completed: !currentStatus });
  };

  const handleDeleteCustomAssignment = (id: string) => {
    deleteCustomAssignment.mutate(id);
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>To-Do List</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Custom Task</DialogTitle>
              <DialogDescription>
                Create a task with details to track your work
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-name">Task Name *</Label>
                <Input
                  id="task-name"
                  placeholder="Enter task name..."
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-subject">Subject / Course</Label>
                <Input
                  id="task-subject"
                  placeholder="e.g., Math, Physics, Work..."
                  value={taskSubject}
                  onChange={(e) => setTaskSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="datetime-local"
                  value={taskDueDate ? format(taskDueDate, "yyyy-MM-dd'T'HH:mm") : ""}
                  onChange={(e) => setTaskDueDate(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-notes">Notes</Label>
                <Textarea
                  id="task-notes"
                  placeholder="Additional details..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateTask} className="w-full" disabled={!taskName.trim()}>
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Todo Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTodo();
              }
            }}
          />
        </div>
        {/* Custom Assignments */}
        {customAssignments && customAssignments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              My Assignments
            </h3>
            <div className="space-y-2">
              {customAssignments
                .filter((a) => !a.completed || (a.due_at && new Date(a.due_at) >= new Date()))
                .slice(0, 5)
                .map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-2 p-2 border border-border rounded-lg"
                  >
                    <Checkbox
                      checked={assignment.completed}
                      onCheckedChange={() =>
                        handleToggleCustomAssignment(assignment.id, assignment.completed)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          assignment.completed
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {assignment.name}
                      </p>
                      {assignment.course_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {assignment.course_name}
                        </p>
                      )}
                      {assignment.due_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(assignment.due_at), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                    <Badge className={getPriorityColor(assignment.priority)}>
                      {assignment.priority}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCustomAssignment(assignment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Canvas Assignments */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Canvas Assignments
          </h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : upcomingAssignments.length > 0 ? (
            <div className="space-y-2">
              {upcomingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-2 p-2 border border-border rounded-lg"
                >
                  <Checkbox
                    checked={assignment.completed || false}
                    onCheckedChange={() =>
                      handleToggleAssignment(assignment.id, assignment.completed || false)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${assignment.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {assignment.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.due_at
                        ? format(new Date(assignment.due_at), "MMM d, h:mm a")
                        : "No due date"}
                    </p>
                  </div>
                  <Badge
                    className={`${getPriorityColor(
                      assignment.priority
                    )} text-white text-xs ml-2`}
                  >
                    {assignment.priority}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming assignments</p>
          )}
        </div>

        {/* Custom To-Dos */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Custom Tasks
          </h3>
          <div className="space-y-2">
            {customTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-2 p-2 border border-border rounded-lg"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      todo.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {todo.text}
                  </p>
                  {todo.subject && (
                    <p className="text-xs text-muted-foreground truncate">
                      {todo.subject}
                    </p>
                  )}
                  {todo.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      {format(todo.dueDate, "MMM d, h:mm a")}
                    </p>
                  )}
                  {todo.notes && (
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {todo.notes}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
          ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodoList;
