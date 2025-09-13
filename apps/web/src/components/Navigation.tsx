import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center space-x-8">
          <div className="flex space-x-6">
            <Link
              to="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/") 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              Home
            </Link>
            <Link
              to="/fine-tune"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/fine-tune") 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              Fine Tune
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;