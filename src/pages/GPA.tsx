import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { useCanvasCourses, CanvasCourse } from "@/hooks/useCanvasCourses";
import { useState, useEffect } from "react";

interface CourseWithGrade extends CanvasCourse {
  current_grade: string | null;
  current_score: number | null;
}

const GPA = () => {
  const { data: courses = [], isLoading, error } = useCanvasCourses() as { 
    data: CourseWithGrade[] | undefined; 
    isLoading: boolean; 
    error: Error | null;
  };

  // Track pass/fail courses in localStorage
  const [passFailCourses, setPassFailCourses] = useState<Set<number>>(() => {
    const saved = localStorage.getItem("passFailCourses");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem("passFailCourses", JSON.stringify([...passFailCourses]));
  }, [passFailCourses]);

  const togglePassFail = (courseId: number) => {
    setPassFailCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const gradePoints: Record<string, number> = {
    "A+": 4.0,
    "A": 4.0,
    "A-": 3.7,
    "B+": 3.3,
    "B": 3.0,
    "B-": 2.7,
    "C+": 2.3,
    "C": 2.0,
    "C-": 1.7,
    "D+": 1.3,
    "D": 1.0,
    "D-": 0.7,
    "F": 0.0,
  };

  const getLetterGrade = (score: number | null): string => {
    if (score === null) return "N/A";
    if (score >= 93) return "A";
    if (score >= 90) return "A-";
    if (score >= 87) return "B+";
    if (score >= 83) return "B";
    if (score >= 80) return "B-";
    if (score >= 77) return "C+";
    if (score >= 73) return "C";
    if (score >= 70) return "C-";
    if (score >= 67) return "D+";
    if (score >= 63) return "D";
    if (score >= 60) return "D-";
    return "F";
  };

  const getGradeColor = (grade: string) => {
    const point = gradePoints[grade] || 0;
    if (point >= 3.7) return "bg-green-500";
    if (point >= 3.0) return "bg-blue-500";
    if (point >= 2.0) return "bg-yellow-500";
    if (grade === "N/A") return "bg-muted";
    return "bg-red-500";
  };

  const calculateGPA = () => {
    let totalPoints = 0;
    let totalCredits = 0;
    const defaultCredits = 3; // Assume 3 credits per course if not specified

    courses.forEach((course) => {
      // Skip pass/fail courses
      if (passFailCourses.has(course.id)) return;
      
      const grade = course.current_grade || getLetterGrade(course.current_score);
      if (grade === "N/A") return;
      
      const points = gradePoints[grade] || 0;
      totalPoints += points * defaultCredits;
      totalCredits += defaultCredits;
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "N/A";
  };

  const gpa = calculateGPA();
  const gradedCourses = courses.filter(c => 
    !passFailCourses.has(c.id) && 
    (c.current_grade || c.current_score !== null)
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold text-foreground mb-6">GPA Calculator</h1>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Unable to load grades from Canvas. Please check your Canvas credentials.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">GPA Calculator</h1>

        {/* GPA Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current GPA
              </CardTitle>
              <GraduationCap className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{gpa}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {gradedCourses} graded course{gradedCourses !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Courses
              </CardTitle>
              <BookOpen className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{courses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pass/Fail Courses
              </CardTitle>
              <BookOpen className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{passFailCourses.size}</div>
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        <Card>
          <CardHeader>
            <CardTitle>Current Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-muted-foreground">No courses found.</p>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => {
                  const grade = course.current_grade || getLetterGrade(course.current_score);
                  const isPassFail = passFailCourses.has(course.id);
                  
                  return (
                    <div
                      key={course.id}
                      className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{course.name}</h3>
                          <p className="text-sm text-muted-foreground">{course.course_code}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`pass-fail-${course.id}`}
                              checked={isPassFail}
                              onCheckedChange={() => togglePassFail(course.id)}
                            />
                            <Label 
                              htmlFor={`pass-fail-${course.id}`}
                              className="text-sm text-muted-foreground whitespace-nowrap"
                            >
                              P/F
                            </Label>
                          </div>
                          {course.current_score !== null && (
                            <div className="text-sm text-muted-foreground">
                              {course.current_score.toFixed(1)}%
                            </div>
                          )}
                          <Badge 
                            className={`${isPassFail ? 'bg-muted text-muted-foreground' : getGradeColor(grade)} ${!isPassFail && grade !== 'N/A' ? 'text-white' : ''}`}
                          >
                            {isPassFail ? 'P/F' : grade}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GPA;
