import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  BarChart, 
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSyncGmail } from "@/lib/gmail";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { mutate: syncGmail, isPending: isSyncing } = useSyncGmail();
  
  // Query for prospects
  const { data: prospects } = useQuery({
    queryKey: ["/api/prospects"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Query for follow-ups
  const { data: followUps } = useQuery({
    queryKey: ["/api/follow-ups"],
    staleTime: 0, // Always fresh
  });
  
  const prospectCount = prospects?.length || 0;
  // Only count pending follow-ups (not completed ones)
  const pendingFollowUps = Array.isArray(followUps) ? followUps.filter((f: any) => !f.completed) : [];
  const followUpCount = pendingFollowUps.length;
  
  // Navigation items
  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="w-5 mr-3" />,
      active: location === "/",
      badge: null
    },
    {
      name: "Prospects",
      href: "/prospects",
      icon: <Users className="w-5 mr-3" />,
      active: location === "/prospects",
      badge: prospectCount > 0 ? prospectCount : null
    },
    {
      name: "Follow-ups",
      href: "/follow-ups",
      icon: <Mail className="w-5 mr-3" />,
      active: location === "/follow-ups",
      badge: followUpCount > 0 ? followUpCount : null,
      badgeColor: "bg-red-500 text-white dark:bg-red-600"
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: <BarChart className="w-5 mr-3" />,
      active: location === "/analytics",
      badge: null
    },
    {
      name: "Settings",
      href: "/settings",
      icon: <Settings className="w-5 mr-3" />,
      active: location === "/settings",
      badge: null
    }
  ];
  
  return (
    <aside className="bg-white dark:bg-card w-64 border-r border-neutral-300 dark:border-border flex flex-col h-full">
      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link 
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md transition-standard",
                  item.active
                    ? "text-primary bg-blue-50 dark:bg-primary/10 hover:bg-blue-100 dark:hover:bg-primary/20"
                    : "text-foreground hover:bg-neutral-200 dark:hover:bg-muted"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
                {item.badge && (
                  <Badge 
                    className={cn(
                      "ml-auto", 
                      item.badgeColor || "bg-primary text-white"
                    )}
                    variant="outline"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Gmail Integration Status */}
      <div className="border-t border-neutral-300 dark:border-border p-4">
        <div className="bg-neutral-200 dark:bg-muted p-3 rounded-md">
          <div className="flex items-center mb-2">
            <img 
              src="https://www.google.com/gmail/about/static/images/logo-gmail.png?cache=1adba63" 
              alt="Gmail logo" 
              className="w-5 h-5 mr-2" 
            />
            <span className="text-sm font-medium">Gmail Integration</span>
            {user?.gmailConnected ? (
              <Badge className="ml-auto text-xs bg-secondary text-white">Active</Badge>
            ) : (
              <Badge className="ml-auto text-xs bg-neutral-400 text-white">Not Connected</Badge>
            )}
          </div>
          
          {user?.gmailConnected ? (
            <>
              <div className="text-xs text-neutral-500 mb-2">
                Last synced: {isSyncing ? 'Syncing...' : user?.lastSyncDate ? new Date(user.lastSyncDate).toLocaleDateString() + ', ' + new Date(user.lastSyncDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full text-xs"
                    onClick={() => syncGmail()}
                    disabled={isSyncing}
                  >
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Sync emails from your Gmail account
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-xs"
              onClick={() => window.location.href = "/settings"}
            >
              Connect Gmail
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
