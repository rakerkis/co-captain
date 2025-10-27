import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Assignment } from "./AssignmentCard";

interface CalendarViewProps {
  assignments: Assignment[];
  onDateClick?: (date: Date) => void;
}

const CalendarView = ({ assignments, onDateClick }: CalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getAssignmentsForDay = (day: Date) => {
    return assignments.filter((assignment) => isSameDay(assignment.dueDate, day));
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            const dayAssignments = getAssignmentsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);

            return (
              <button
                key={index}
                onClick={() => onDateClick?.(day)}
                className={`min-h-[80px] p-2 rounded-lg border transition-all hover:shadow-md ${
                  isCurrentMonth
                    ? "bg-card border-border"
                    : "bg-muted/30 border-transparent"
                } ${isDayToday ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex flex-col h-full">
                  <span
                    className={`text-sm font-medium mb-1 ${
                      isDayToday
                        ? "text-primary font-bold"
                        : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex-1 space-y-1">
                    {dayAssignments.slice(0, 2).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="text-xs px-1 py-0.5 rounded truncate"
                        style={{
                          backgroundColor: `${
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
                              : "hsl(var(--subject-other))"
                          }20`,
                          color:
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
                      >
                        {assignment.title}
                      </div>
                    ))}
                    {dayAssignments.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAssignments.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default CalendarView;
