import { format } from "date-fns";
import { Calendar, Clock, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: Date;
  description?: string;
  completed?: boolean;
}

interface AssignmentCardProps {
  assignment: Assignment;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
}

const subjectColors: Record<string, string> = {
  Math: "hsl(var(--subject-math))",
  Science: "hsl(var(--subject-science))",
  English: "hsl(var(--subject-english))",
  History: "hsl(var(--subject-history))",
  Art: "hsl(var(--subject-art))",
  Other: "hsl(var(--subject-other))",
};

const AssignmentCard = ({
  assignment,
  onEdit,
  onDelete,
  onToggleComplete,
}: AssignmentCardProps) => {
  const daysUntilDue = Math.ceil(
    (assignment.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

  return (
    <Card
      className={`transition-all hover:shadow-lg ${
        assignment.completed ? "opacity-60" : ""
      }`}
      style={{
        borderLeft: `4px solid ${subjectColors[assignment.subject] || subjectColors.Other}`,
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={assignment.completed}
                onChange={() => onToggleComplete?.(assignment.id)}
                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <div className="flex-1">
                <h3
                  className={`font-semibold text-foreground ${
                    assignment.completed ? "line-through" : ""
                  }`}
                >
                  {assignment.title}
                </h3>
                {assignment.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {assignment.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: `${subjectColors[assignment.subject] || subjectColors.Other}15`,
                  color: subjectColors[assignment.subject] || subjectColors.Other,
                  borderColor: subjectColors[assignment.subject] || subjectColors.Other,
                }}
              >
                {assignment.subject}
              </Badge>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{format(assignment.dueDate, "MMM dd, yyyy")}</span>
              </div>

              {!assignment.completed && (
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isOverdue
                      ? "text-destructive"
                      : isDueSoon
                      ? "text-orange-500"
                      : "text-muted-foreground"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    {isOverdue
                      ? `${Math.abs(daysUntilDue)} days overdue`
                      : isDueSoon
                      ? `Due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`
                      : `${daysUntilDue} days left`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit?.(assignment)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete?.(assignment.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentCard;
