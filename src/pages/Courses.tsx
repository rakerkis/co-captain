import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User } from "lucide-react";

interface Course {
  id: string;
  code: string;
  name: string;
  instructor: string;
  grade: string;
  color: string;
}

const Courses = () => {
  // Sample data - in a real app, this would come from Canvas
  const courses: Course[] = [
    {
      id: "1",
      code: "CS 201",
      name: "Data Structures & Algorithms",
      instructor: "Dr. Sarah Johnson",
      grade: "A",
      color: "bg-blue-500",
    },
    {
      id: "2",
      code: "MATH 152",
      name: "Calculus II",
      instructor: "Prof. Michael Chen",
      grade: "B+",
      color: "bg-green-500",
    },
    {
      id: "3",
      code: "ENG 101",
      name: "English Composition",
      instructor: "Dr. Emily Roberts",
      grade: "A-",
      color: "bg-purple-500",
    },
    {
      id: "4",
      code: "PHYS 201",
      name: "Physics I",
      instructor: "Prof. David Wilson",
      grade: "B",
      color: "bg-orange-500",
    },
    {
      id: "5",
      code: "PSY 101",
      name: "Introduction to Psychology",
      instructor: "Dr. Lisa Anderson",
      grade: "A",
      color: "bg-pink-500",
    },
    {
      id: "6",
      code: "HIST 105",
      name: "World History",
      instructor: "Prof. James Taylor",
      grade: "B+",
      color: "bg-red-500",
    },
  ];

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-500";
    if (grade.startsWith("B")) return "bg-blue-500";
    if (grade.startsWith("C")) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">My Courses</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg transition-all cursor-pointer group"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${course.color} flex items-center justify-center shrink-0`}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-muted-foreground">
                          {course.code}
                        </h3>
                        <h2 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {course.name}
                        </h2>
                      </div>
                      <Badge className={`${getGradeColor(course.grade)} text-white shrink-0`}>
                        {course.grade}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span className="truncate">{course.instructor}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Courses;
