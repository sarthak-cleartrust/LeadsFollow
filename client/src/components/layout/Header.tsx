import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Cog, ChevronDown, LogOut, User, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const { user, logout, isLogoutPending } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  // Query pending follow-ups for notification count
  const { data: followUps } = useQuery({
    queryKey: ["/api/follow-ups"],
    staleTime: 60 * 1000, // 1 minute
  });

  const notificationCount = followUps?.length || 0;

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name?.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';
  };

  return (
    <header className="bg-white dark:bg-card border-b border-neutral-300 dark:border-border shadow-sm py-2 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-primary font-bold text-2xl mr-2">LeadFollow</div>
          <span className="text-neutral-400 text-sm bg-neutral-200 dark:bg-muted px-2 py-1 rounded">Beta</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="p-2 text-neutral-500 hover:text-primary transition-standard"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 bg-alert hover:bg-alert text-white text-xs px-1 min-w-5 h-5 flex items-center justify-center"
                      variant="outline"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
          </div>
          
          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="p-2 text-neutral-500 hover:text-primary transition-standard"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>
          
          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="p-2 text-neutral-500 hover:text-primary transition-standard"
                onClick={() => window.location.href = "/settings"}
              >
                <Cog className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
          
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                  <span>{getInitials(user?.fullName || '')}</span>
                </div>
                <div className="ml-2 hidden sm:block">
                  <span className="text-sm font-medium block">{user?.fullName}</span>
                  <span className="text-xs text-neutral-400">{user?.email}</span>
                </div>
                <ChevronDown className="h-4 w-4 ml-1 text-neutral-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLogoutPending ? "Logging out..." : "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
