import { useState, useEffect, useRef } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { eventBus, EVENTS } from "@/lib/eventBus";
import { useRefreshTrigger } from "@/lib/refreshTrigger";

export default function Header() {
  const { user, logout, isLogoutPending } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  const notificationRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [forceRefresh, setForceRefresh] = useState(0);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Query pending follow-ups for notification count - add forceRefresh to force re-render
  const { data: followUps, refetch: refetchFollowUps } = useQuery({
    queryKey: ["/api/follow-ups", forceRefresh],
    staleTime: 0, // Always fresh
  });

  // Listen for refresh trigger
  useEffect(() => {
    const unsubscribe = useRefreshTrigger(() => {
      setForceRefresh(prev => prev + 1);
      refetchFollowUps();
    });

    return unsubscribe;
  }, [refetchFollowUps]);

  // Only count pending follow-ups (not completed ones)
  const pendingFollowUps = Array.isArray(followUps) ? followUps.filter((f: any) => !f.completed) : [];
  const notificationCount = pendingFollowUps.length;

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
          <div className="relative" ref={notificationRef}>
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
                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white text-xs px-1 min-w-5 h-5 flex items-center justify-center"
                      variant="outline"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
            
            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white dark:bg-card border border-neutral-300 dark:border-border rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-neutral-200 dark:border-border">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {pendingFollowUps && pendingFollowUps.length > 0 ? (
                    pendingFollowUps.map((followUp: any) => (
                      <div key={followUp.id} className="p-3 border-b border-neutral-100 dark:border-border hover:bg-neutral-50 dark:hover:bg-muted">
                        <div className="text-sm font-medium">Follow-up due</div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {followUp.type} follow-up for <span className="font-medium">{followUp.prospect?.name || 'Unknown prospect'}</span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          Due: {new Date(followUp.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-neutral-500 text-sm">
                      No pending notifications
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-neutral-200 dark:border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-primary"
                    onClick={() => {
                      setShowNotifications(false);
                      window.location.href = "/follow-ups";
                    }}
                  >
                    View all follow-ups
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="p-2 text-neutral-500 hover:text-primary transition-standard"
                onClick={() => {
                  const root = document.documentElement;
                  const currentlyDark = root.classList.contains('dark');
                  
                  if (currentlyDark) {
                    root.classList.remove('dark');
                    root.classList.add('light');
                    localStorage.setItem('leadfollow-theme', 'light');
                    setIsDark(false);
                    console.log("Switched to light mode");
                  } else {
                    root.classList.remove('light');
                    root.classList.add('dark');
                    localStorage.setItem('leadfollow-theme', 'dark');
                    setIsDark(true);
                    console.log("Switched to dark mode");
                  }
                }}
              >
                {isDark ? (
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
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive" 
                onClick={() => {
                  // Direct logout implementation
                  fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json"
                    }
                  })
                  .then(() => {
                    // Force redirect to login page
                    window.location.href = "/";
                  })
                  .catch(err => {
                    console.error("Logout error:", err);
                  });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
