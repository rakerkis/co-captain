import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen } from "lucide-react";

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  grade: string;
}

const GPA = () => {
  // Sample data - in a real app, this would come from Canvas or a database
  const courses: Course[] = [
    { id: "1", name: "Data Structures & Algorithms", code: "CS 201", credits: 4, grade: "A" },
    { id: "2", name: "Calculus II", code: "MATH 152", credits: 4, grade: "B+" },
    { id: "3", name: "English Composition", code: "ENG 101", credits: 3, grade: "A-" },
    { id: "4", name: "Physics I", code: "PHYS 201", credits: 4, grade: "B" },
    { id: "5", name: "Introduction to Psychology", code: "PSY 101", credits: 3, grade: "A" },
  ];

  const gradePoints: Record<string, number> = {
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
    "F": 0.0,
  };

  const getGradeColor = (grade: string) => {
    const point = gradePoints[grade] || 0;
    if (point >= 3.7) return "bg-green-500";
    if (point >= 3.0) return "bg-blue-500";
    if (point >= 2.0) return "bg-yellow-500";
    return "bg-red-500";
  };

  const calculateGPA = () => {
    let totalPoints = 0;
    let totalCredits = 0;

    courses.forEach((course) => {
      const points = gradePoints[course.grade] || 0;
      totalPoints += points * course.credits;
      totalCredits += course.credits;
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  };

  const gpa = calculateGPA();
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Credits
              </CardTitle>
              <BookOpen className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{totalCredits}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Courses
              </CardTitle>
              <BookOpen className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{courses.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        <Card>
          <CardHeader>
            <CardTitle>Current Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{course.name}</h3>
                      <p className="text-sm text-muted-foreground">{course.code}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-sm text-muted-foreground">
                        {course.credits} credits
                      </div>
                      <Badge className={`${getGradeColor(course.grade)} text-white`}>
                        {course.grade}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GPA;
