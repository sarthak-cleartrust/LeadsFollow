import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Mail, 
  Calendar, 
  Clock, 
  BarChart,
  Plus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import GmailIntegrationModal from "@/components/modals/GmailIntegrationModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [showGmailModal, setShowGmailModal] = useState(false);
  
  // Query for prospects with error handling
  const { data: prospects = [] } = useQuery({
    queryKey: ["/api/prospects"],
    enabled: !!user,
    retry: false,
    onError: () => {
      console.log("Could not load prospects");
    }
  });
  
  // Query for follow-ups with error handling
  const { data: followUps = [] } = useQuery({
    queryKey: ["/api/follow-ups"],
    enabled: !!user,
    retry: false,
    onError: () => {
      console.log("Could not load follow-ups");
    }
  });
  
  // Calculate stats
  const stats = {
    totalProspects: prospects?.length || 0,
    pendingFollowUps: followUps?.filter((f: any) => !f.completed)?.length || 0,
    overdueFollowUps: followUps?.filter((f: any) => {
      if (f.completed) return false;
      const dueDate = new Date(f.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    })?.length || 0,
    activeProspects: prospects?.filter((p: any) => p.status === 'active')?.length || 0,
    completedFollowUps: followUps?.filter((f: any) => f.completed)?.length || 0
  };
  
  return (
    <div className="p-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Gmail integration prompt */}
      {!user?.gmailConnected && (
        <Card className="mb-6 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start md:items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Connect your Gmail account</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Connect Gmail to track prospect communications and get follow-up reminders.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowGmailModal(true)} className="shrink-0">
                Connect Gmail
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Prospects</CardTitle>
            <div className="text-2xl font-bold">{stats.totalProspects}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-neutral-500">
              <Users className="h-4 w-4 mr-1 text-primary" />
              <span>Active lead network</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Pending Follow-ups</CardTitle>
            <div className="text-2xl font-bold">{stats.pendingFollowUps}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-neutral-500">
              <Calendar className="h-4 w-4 mr-1 text-primary" />
              <span>Scheduled follow-ups</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Needs Follow-up</CardTitle>
            <div className="text-2xl font-bold text-orange-500">{stats.overdueFollowUps}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-neutral-500">
              <Clock className="h-4 w-4 mr-1 text-orange-500" />
              <span>Overdue communications</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Completed Follow-ups</CardTitle>
            <div className="text-2xl font-bold text-green-500">{stats.completedFollowUps}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-neutral-500">
              <BarChart className="h-4 w-4 mr-1 text-green-500" />
              <span>Successfully completed</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Active Prospects</CardTitle>
            <div className="text-2xl font-bold text-blue-500">{stats.activeProspects}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-neutral-500">
              <Users className="h-4 w-4 mr-1 text-blue-500" />
              <span>Recently contacted</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Get Started Card */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to set up your lead tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-md flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                <span className="text-primary font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-medium mb-1">Connect your Gmail</h3>
                <p className="text-sm text-neutral-500 mb-2">
                  Link your email to automatically track communications with prospects
                </p>
                <Button 
                  size="sm" 
                  onClick={() => setShowGmailModal(true)}
                  className="text-xs"
                >
                  Connect Gmail
                </Button>
              </div>
            </div>
            
            <div className="p-4 border rounded-md flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                <span className="text-primary font-bold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-medium mb-1">Add your first prospect</h3>
                <p className="text-sm text-neutral-500 mb-2">
                  Create prospects to start tracking your leads
                </p>
                <Button 
                  size="sm" 
                  onClick={() => window.location.href = "/prospects"}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Prospect
                </Button>
              </div>
            </div>
            
            <div className="p-4 border rounded-md flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                <span className="text-primary font-bold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-medium mb-1">Customize follow-up settings</h3>
                <p className="text-sm text-neutral-500 mb-2">
                  Set your preferred follow-up intervals and notification preferences
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.location.href = "/settings"}
                  className="text-xs"
                >
                  Go to Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Tips & Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle>Tips & Best Practices</CardTitle>
            <CardDescription>
              Maximize your follow-up effectiveness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-1">Optimal Follow-up Timing</h3>
              <p className="text-sm text-neutral-500">
                Research shows that following up within 24-48 hours increases response rates by up to 50%. 
                Set your initial follow-up timing in Settings.
              </p>
            </div>
            
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-1">Use Varied Communication Channels</h3>
              <p className="text-sm text-neutral-500">
                Mix email, phone calls, and other contact methods for higher engagement. 
                Track different contact types in your follow-ups.
              </p>
            </div>
            
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-1">Personalize Each Touchpoint</h3>
              <p className="text-sm text-neutral-500">
                Reference previous conversations and add personalized notes when scheduling follow-ups 
                to increase your prospect engagement.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Gmail Integration Modal */}
      <GmailIntegrationModal
        isOpen={showGmailModal}
        onClose={() => setShowGmailModal(false)}
      />
    </div>
  );
}
