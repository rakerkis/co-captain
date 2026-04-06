import { Calendar, ClipboardList, GraduationCap, BookOpen, Timer, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Calendar, label: "Home", path: "/" },
  { icon: ClipboardList, label: "Assignments", path: "/assignments" },
  { icon: GraduationCap, label: "GPA", path: "/gpa" },
  { icon: BookOpen, label: "Courses", path: "/courses" },
  { icon: Timer, label: "Focus", path: "/focus" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const MobileTabBar = () => {
  const location = useLocation();

  return (
    <div className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border flex">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[49px]",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
            <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-normal")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default MobileTabBar;
