import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ExternalLink, Loader2, Settings } from "lucide-react";
import { useCanvasCourses, CanvasCourse } from "@/hooks/useCanvasCourses";
import { useHiddenCourses } from "@/hooks/useHiddenCourses";
import { useCourseEventSettings } from "@/hooks/useCourseEventSettings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getCourseColor, setCustomCourseColor, COURSE_COLORS } from "@/lib/courseColors";

const Courses = () => {
  const { data: courses, isLoading } = useCanvasCourses();
  const [, forceUpdate] = useState(0);
  const { 
    toggleCalendarVisibility, 
    toggleAssignmentsVisibility, 
    isCourseHiddenFromCalendar, 
    isCourseHiddenFromAssignments 
  } = useHiddenCourses();
  const { toggleCourseTreatAsEvent, isCourseTreatedAsEvent } = useCourseEventSettings();

  const handleColorChange = (courseId: number, colorClass: string) => {
    setCustomCourseColor(courseId, colorClass);
    forceUpdate((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">My Courses</h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !courses || courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No courses found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course: CanvasCourse, index: number) => (
              <Card key={course.id} className="hover:shadow-lg transition-all group h-full relative">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <a
                      href={course.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-lg ${getCourseColor(course.id)} flex items-center justify-center shrink-0`}
                    >
                      <BookOpen className="w-6 h-6 text-white" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <a
                        href={course.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <h3 className="font-bold text-sm text-muted-foreground">
                          {course.course_code}
                        </h3>
                        <h2 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {course.name}
                        </h2>
                        <div className="flex items-center gap-1 text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Open in Canvas</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </a>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          <Settings className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-popover" align="end">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Course Color</Label>
                            <div className="grid grid-cols-6 gap-1.5">
                              {COURSE_COLORS.map((color) => (
                                <button
                                  key={color.class}
                                  onClick={() => handleColorChange(course.id, color.class)}
                                  className={`w-7 h-7 rounded-md ${color.class} hover:scale-110 transition-transform ${
                                    getCourseColor(course.id) === color.class
                                      ? "ring-2 ring-white ring-offset-2 ring-offset-background"
                                      : ""
                                  }`}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={`show-calendar-${course.id}`} className="text-sm">
                              Show on calendar
                            </Label>
                            <Switch
                              id={`show-calendar-${course.id}`}
                              checked={!isCourseHiddenFromCalendar(course.id)}
                              onCheckedChange={() => toggleCalendarVisibility(course.id)}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={`show-assignments-${course.id}`} className="text-sm">
                              Show assignments
                            </Label>
                            <Switch
                              id={`show-assignments-${course.id}`}
                              checked={!isCourseHiddenFromAssignments(course.id)}
                              onCheckedChange={() => toggleAssignmentsVisibility(course.id)}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={`treat-as-event-${course.id}`} className="text-sm">
                              Treat as events
                            </Label>
                            <Switch
                              id={`treat-as-event-${course.id}`}
                              checked={isCourseTreatedAsEvent(course.id)}
                              onCheckedChange={() => toggleCourseTreatAsEvent(course.id)}
                            />
                          </div>
                          {isCourseTreatedAsEvent(course.id) && (
                            <p className="text-xs text-muted-foreground">Assignments from this course will only appear on the calendar.</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
