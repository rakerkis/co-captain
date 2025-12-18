import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCanvasAssignments, useToggleAssignment } from "@/hooks/useCanvasAssignments";
import { useHiddenCourses } from "@/hooks/useHiddenCourses";
import { useAssignmentTypes } from "@/hooks/useAssignmentTypes";
import { useCourseEventSettings } from "@/hooks/useCourseEventSettings";
import { format, isPast, isFuture, subWeeks } from "date-fns";
import { ExternalLink, Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCreateCustomAssignment, useUpdateCustomAssignment } from "@/hooks/useCustomAssignments";
import { toast } from "sonner";

const Assignments = () => {
  const { data, isLoading } = useCanvasAssignments();
  const toggleAssignment = useToggleAssignment();
  const { hiddenAssignmentIds } = useHiddenCourses();
  const { typeOverrides, setAssignmentType, getAssignmentType } = useAssignmentTypes();
  const { isCourseTreatedAsEvent } = useCourseEventSettings();
  const createCustomAssignment = useCreateCustomAssignment();
  const updateCustomAssignment = useUpdateCustomAssignment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    name: "",
    course_name: "",
    due_at: "",
    description: "",
    priority: "medium" as "high" | "medium" | "low",
    type: "assignment" as "assignment" | "event",
  });

  const handleCreateTask = () => {
    if (!newTask.name.trim()) {
      toast.error("Please enter a task name");
      return;
    }
    createCustomAssignment.mutate({
      name: newTask.name,
      course_name: newTask.course_name || null,
      due_at: newTask.due_at || null,
      description: newTask.description || null,
      links: null,
      priority: newTask.priority,
      type: newTask.type,
    }, {
      onSuccess: () => {
        toast.success(newTask.type === "event" ? "Event created successfully" : "Task created successfully");
        setDialogOpen(false);
        setNewTask({ name: "", course_name: "", due_at: "", description: "", priority: "medium", type: "assignment" });
      },
    });
  };

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment({
      id: assignment.id,
      name: assignment.name,
      course_name: assignment.course_name || "",
      due_at: assignment.due_at ? format(new Date(assignment.due_at), "yyyy-MM-dd'T'HH:mm") : "",
      description: assignment.description || "",
      priority: assignment.priority || "medium",
      type: assignment.type || "assignment",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateAssignment = () => {
    if (!editingAssignment?.name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    updateCustomAssignment.mutate({
      id: editingAssignment.id,
      name: editingAssignment.name,
      course_name: editingAssignment.course_name || null,
      due_at: editingAssignment.due_at || null,
      description: editingAssignment.description || null,
      priority: editingAssignment.priority,
      type: editingAssignment.type,
    }, {
      onSuccess: () => {
        toast.success("Updated successfully");
        setEditDialogOpen(false);
        setEditingAssignment(null);
      },
    });
  };

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

  const oneWeekAgo = subWeeks(new Date(), 1);

  // Filter out assignments that are overdue by more than 1 week, hidden, or are events
  const filteredAssignments = assignments.filter((a: any) => {
    // Check if entire course is treated as events
    if (a.course_id && isCourseTreatedAsEvent(a.course_id)) return false;
    // Get the effective type (use override if exists, otherwise use the assignment's type)
    const effectiveType = getAssignmentType(String(a.id)) || a.type || "assignment";
    // Filter out events (they only show on calendar)
    if (effectiveType === "event") return false;
    // Filter out hidden courses
    if (hiddenAssignmentIds.includes(a.course_id)) return false;
    if (!a.due_at) return true; // Keep assignments without due date
    const dueDate = new Date(a.due_at);
    return dueDate >= oneWeekAgo; // Keep if due date is within the last week or in the future
  });

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">All Assignments</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New {newTask.type === "event" ? "Event" : "Task"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="type-toggle">Type</Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${newTask.type === "assignment" ? "text-foreground" : "text-muted-foreground"}`}>Assignment</span>
                    <Switch
                      id="type-toggle"
                      checked={newTask.type === "event"}
                      onCheckedChange={(checked) => setNewTask({ ...newTask, type: checked ? "event" : "assignment" })}
                    />
                    <span className={`text-sm ${newTask.type === "event" ? "text-foreground" : "text-muted-foreground"}`}>Event</span>
                  </div>
                </div>
                {newTask.type === "event" && (
                  <p className="text-xs text-muted-foreground">Events only appear on the calendar and cannot be overdue.</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">{newTask.type === "event" ? "Event" : "Task"} Name *</Label>
                  <Input
                    id="name"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    placeholder={`Enter ${newTask.type === "event" ? "event" : "task"} name`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Subject/Course</Label>
                  <Input
                    id="course"
                    value={newTask.course_name}
                    onChange={(e) => setNewTask({ ...newTask, course_name: e.target.value })}
                    placeholder="Enter subject or course"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due">Due Date</Label>
                  <Input
                    id="due"
                    type="datetime-local"
                    value={newTask.due_at}
                    onChange={(e) => setNewTask({ ...newTask, due_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: "high" | "medium" | "low") => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="description">Notes</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Add any notes..."
                  />
                </div>
                <Button onClick={handleCreateTask} className="w-full" disabled={createCustomAssignment.isPending}>
                  {createCustomAssignment.isPending ? "Creating..." : `Create ${newTask.type === "event" ? "Event" : "Task"}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit {editingAssignment?.type === "event" ? "Event" : "Task"}</DialogTitle>
              </DialogHeader>
              {editingAssignment && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-type-toggle">Type</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${editingAssignment.type === "assignment" ? "text-foreground" : "text-muted-foreground"}`}>Assignment</span>
                      <Switch
                        id="edit-type-toggle"
                        checked={editingAssignment.type === "event"}
                        onCheckedChange={(checked) => setEditingAssignment({ ...editingAssignment, type: checked ? "event" : "assignment" })}
                      />
                      <span className={`text-sm ${editingAssignment.type === "event" ? "text-foreground" : "text-muted-foreground"}`}>Event</span>
                    </div>
                  </div>
                  {editingAssignment.type === "event" && (
                    <p className="text-xs text-muted-foreground">Events only appear on the calendar and cannot be overdue.</p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">{editingAssignment.type === "event" ? "Event" : "Task"} Name *</Label>
                    <Input
                      id="edit-name"
                      value={editingAssignment.name}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-course">Subject/Course</Label>
                    <Input
                      id="edit-course"
                      value={editingAssignment.course_name}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, course_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-due">Due Date</Label>
                    <Input
                      id="edit-due"
                      type="datetime-local"
                      value={editingAssignment.due_at}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, due_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Select
                      value={editingAssignment.priority}
                      onValueChange={(value: "high" | "medium" | "low") => setEditingAssignment({ ...editingAssignment, priority: value })}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="edit-description">Notes</Label>
                    <Textarea
                      id="edit-description"
                      value={editingAssignment.description}
                      onChange={(e) => setEditingAssignment({ ...editingAssignment, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleUpdateAssignment} className="w-full" disabled={updateCustomAssignment.isPending}>
                    {updateCustomAssignment.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

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
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              className={`${getPriorityColor(
                                assignment.priority
                              )} text-white`}
                            >
                              {assignment.priority}
                            </Badge>
                            {assignment.html_url ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56" align="end">
                                  <div className="space-y-3">
                                    <p className="text-sm font-medium">Change Type</p>
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm ${(getAssignmentType(String(assignment.id)) || "assignment") === "assignment" ? "text-foreground" : "text-muted-foreground"}`}>Assignment</span>
                                      <Switch
                                        checked={(getAssignmentType(String(assignment.id)) || "assignment") === "event"}
                                        onCheckedChange={(checked) => {
                                          setAssignmentType(String(assignment.id), checked ? "event" : "assignment");
                                          toast.success(checked ? "Changed to event" : "Changed to assignment");
                                        }}
                                      />
                                      <span className={`text-sm ${(getAssignmentType(String(assignment.id)) || "assignment") === "event" ? "text-foreground" : "text-muted-foreground"}`}>Event</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Events only appear on the calendar.</p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleEditAssignment(assignment)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
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
