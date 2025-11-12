import { Calendar, ClipboardList, GraduationCap, BookOpen, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { icon: Calendar, label: "Calendar", path: "/" },
    { icon: ClipboardList, label: "Assignments", path: "/assignments" },
    { icon: GraduationCap, label: "GPA", path: "/gpa" },
    { icon: BookOpen, label: "Courses", path: "/courses" },
  ];

  return (
    <div className="h-screen w-48 bg-sidebar border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">StudyFlow</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Jane Student</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">jane@university.edu</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
