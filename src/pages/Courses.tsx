import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ExternalLink, Loader2 } from "lucide-react";
import { useCanvasCourses, CanvasCourse } from "@/hooks/useCanvasCourses";

const COURSE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-indigo-500",
];

const Courses = () => {
  const { data: courses, isLoading } = useCanvasCourses();

  const getCourseColor = (index: number) => {
    return COURSE_COLORS[index % COURSE_COLORS.length];
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
              <a
                key={course.id}
                href={course.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg ${getCourseColor(index)} flex items-center justify-center shrink-0`}
                      >
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
