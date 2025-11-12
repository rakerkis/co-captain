import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useCanvasAssignments } from "@/hooks/useCanvasAssignments";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface CustomTodo {
  id: string;
  text: string;
  completed: boolean;
}

const TodoList = () => {
  const { data, isLoading } = useCanvasAssignments();
  const [customTodos, setCustomTodos] = useState<CustomTodo[]>([]);
  const [newTodo, setNewTodo] = useState("");

  const assignments = data?.assignments || [];
  const upcomingAssignments = assignments
    .filter((a) => a.due_at && new Date(a.due_at) >= new Date())
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 5);

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
      <CardHeader>
        <CardTitle>To-Do List</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upcoming Assignments */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Upcoming Assignments
          </h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : upcomingAssignments.length > 0 ? (
            <div className="space-y-2">
              {upcomingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-2 border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
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
          <Button onClick={addTodo} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodoList;
