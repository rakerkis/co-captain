import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Assignment } from "./AssignmentCard";

interface AddAssignmentDialogProps {
  onAdd: (assignment: Omit<Assignment, "id">) => void;
  editingAssignment?: Assignment;
  onEdit?: (assignment: Assignment) => void;
}

const subjects = ["Math", "Science", "English", "History", "Art", "Other"];

const AddAssignmentDialog = ({
  onAdd,
  editingAssignment,
  onEdit,
}: AddAssignmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(editingAssignment?.title || "");
  const [subject, setSubject] = useState(editingAssignment?.subject || "");
  const [description, setDescription] = useState(
    editingAssignment?.description || ""
  );
  const [dueDate, setDueDate] = useState(
    editingAssignment?.dueDate
      ? new Date(editingAssignment.dueDate).toISOString().split("T")[0]
      : ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !dueDate) return;

    const assignmentData = {
      title,
      subject,
      description,
      dueDate: new Date(dueDate),
      completed: editingAssignment?.completed || false,
    };

    if (editingAssignment && onEdit) {
      onEdit({ ...assignmentData, id: editingAssignment.id });
    } else {
      onAdd(assignmentData);
    }

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setSubject("");
    setDescription("");
    setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? "Edit Assignment" : "Add New Assignment"}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment
                ? "Update assignment details below."
                : "Create a new assignment with due date and details."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Assignment title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={subject} onValueChange={setSubject} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional details about the assignment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">
              {editingAssignment ? "Update" : "Create"} Assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAssignmentDialog;
