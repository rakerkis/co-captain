import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Calendar } from "lucide-react";
import { useCanvasAssignments, useToggleAssignment } from "@/hooks/useCanvasAssignments";
import { useCustomAssignments, useCreateCustomAssignment, useToggleCustomAssignment, useDeleteCustomAssignment } from "@/hooks/useCustomAssignments";
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
}

const TodoList = () => {
  const { toast } = useToast();
  const { data, isLoading } = useCanvasAssignments();
  const toggleAssignment = useToggleAssignment();
  const { data: customAssignments, isLoading: customLoading } = useCustomAssignments();
  const createCustomAssignment = useCreateCustomAssignment();
  const toggleCustomAssignment = useToggleCustomAssignment();
  const deleteCustomAssignment = useDeleteCustomAssignment();
  
  const [customTodos, setCustomTodos] = useState<CustomTodo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    due_at: "",
    course_name: "",
    description: "",
    links: "",
    priority: "medium" as "high" | "medium" | "low",
  });

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
    .filter((a) => a.due_at && new Date(a.due_at) >= new Date())
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

  const handleCreateAssignment = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save assignments.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) return;

    await createCustomAssignment.mutateAsync({
      name: formData.name,
      due_at: formData.due_at || null,
      course_name: formData.course_name || null,
      description: formData.description || null,
      links: formData.links || null,
      priority: formData.priority,
    });

    // Reset form
    setFormData({
      name: "",
      due_at: "",
      course_name: "",
      description: "",
      links: "",
      priority: "medium",
    });
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
              <DialogTitle>Create Assignment</DialogTitle>
              <DialogDescription>
                {isAuthenticated 
                  ? "Add a new custom assignment or event to your calendar"
                  : "Log in to save custom assignments"}
              </DialogDescription>
            </DialogHeader>
            {!isAuthenticated ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-muted-foreground">
                  You need to be logged in to create and save custom assignments.
                </p>
                <Button asChild className="w-full">
                  <Link to="/auth">Log In / Sign Up</Link>
                </Button>
              </div>
            ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Assignment name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_at">Due Date</Label>
                <Input
                  id="due_at"
                  type="datetime-local"
                  value={formData.due_at}
                  onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course_name">Course/Subject</Label>
                <Input
                  id="course_name"
                  placeholder="e.g., Math 101"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "high" | "medium" | "low") =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Assignment details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="links">Important Links</Label>
                <Input
                  id="links"
                  placeholder="https://..."
                  value={formData.links}
                  onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateAssignment} className="w-full">
                Create Assignment
              </Button>
            </div>
            )}
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
                <span
                  className={`flex-1 text-sm ${
                    todo.completed
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {todo.text}
                </span>
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
