import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Prospects from "@/pages/Prospects";
import FollowUps from "@/pages/FollowUps";
import Settings from "@/pages/Settings";
import Auth from "@/pages/Auth";
import GmailCallback from "@/pages/GmailCallback";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { startNotificationService, stopNotificationService } from "@/lib/notifications";

function App() {
  const { user, isLoading } = useAuth();
  
  // Query for follow-up settings to check notification preferences
  const { data: settings } = useQuery({
    queryKey: ["/api/follow-up-settings"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  
  // Start notification service if browser notifications are enabled
  useEffect(() => {
    if (user && settings?.notifyBrowser) {
      startNotificationService();
    } else {
      stopNotificationService();
    }
    
    return () => {
      stopNotificationService();
    };
  }, [user, settings?.notifyBrowser]);
  
  // Show a loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading LeadFollow...</p>
        </div>
      </div>
    );
  }
  
  // Special case: Allow Gmail callback page to work without authentication
  const path = window.location.pathname;
  // Check for both potential callback paths
  if (path === "/auth/gmail-callback" || path === "/gmail/callback" || path.includes("gmail/callback") || path.includes("gmailcallback")) {
    return (
      <div className="min-h-screen">
        <GmailCallback />
      </div>
    );
  }
  
  // Show login/register page if not logged in
  if (!user) {
    return (
      <div className="min-h-screen">
        <Auth />
      </div>
    );
  }
  
  // Show main application with authenticated layout
  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/prospects" component={Prospects} />
              <Route path="/follow-ups" component={FollowUps} />
              <Route path="/settings" component={Settings} />
              <Route path="/auth/gmail-callback" component={GmailCallback} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
