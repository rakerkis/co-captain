import { Calendar, ClipboardList, GraduationCap, BookOpen, User, Timer, LogOut, LogIn } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

interface SidebarProps {
  session: Session | null;
}

const Sidebar = ({ session }: SidebarProps) => {
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    }
  };

  const navItems = [
    { icon: Calendar, label: "Home", path: "/" },
    { icon: ClipboardList, label: "Assignments", path: "/assignments" },
    { icon: GraduationCap, label: "GPA", path: "/gpa" },
    { icon: BookOpen, label: "Courses", path: "/courses" },
    { icon: Timer, label: "Focus", path: "/focus" },
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
        {session ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/50 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sidebar-foreground/60 truncate">{session.user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </>
        ) : (
          <Link to="/auth">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
