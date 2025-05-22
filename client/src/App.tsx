import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-background">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }
  
  return <Component />;
}

function Router() {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return (
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/prospects" component={() => <ProtectedRoute component={Prospects} />} />
              <Route path="/follow-ups" component={() => <ProtectedRoute component={FollowUps} />} />
              <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    );
  }
  
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="*" component={() => {
        window.location.href = "/auth";
        return null;
      }} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
