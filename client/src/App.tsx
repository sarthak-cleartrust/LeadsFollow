import { Switch, Route, useLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Prospects from "@/pages/Prospects";
import FollowUps from "@/pages/FollowUps";
import Settings from "@/pages/Settings";
import Auth from "@/pages/Auth";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Show a loading indicator while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to auth if not authenticated and not already on auth page
  if (!isAuthenticated && location !== "/auth") {
    // Use a delayed redirect to ensure React has time to process state changes
    setTimeout(() => setLocation("/auth"), 10);
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <p>Please log in to continue...</p>
        </div>
      </div>
    );
  }
  
  // Show authentication page
  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <Switch>
          <Route path="/auth" component={Auth} />
          <Route component={() => {
            setLocation("/auth");
            return null;
          }} />
        </Switch>
      </TooltipProvider>
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
              <Route path="/prospects" component={Prospects} />
              <Route path="/follow-ups" component={FollowUps} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
