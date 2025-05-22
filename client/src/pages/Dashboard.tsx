import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Mail, 
  Calendar, 
  Clock, 
  BarChart, 
  ChevronRight,
  CalendarDays
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/gmail";
import { useSyncGmail } from "@/lib/gmail";
import { useAuth } from "@/hooks/useAuth";
import FollowUpModal from "@/components/modals/FollowUpModal";
import GmailIntegrationModal from "@/components/modals/GmailIntegrationModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const { mutate: syncGmail, isPending: isSyncing } = useSyncGmail();
  
  // Query for prospects
  const { data: prospects, isLoading: isLoadingProspects } = useQuery({
    queryKey: ["/api/prospects"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Query for follow-ups
  const { data: followUps, isLoading: isLoadingFollowUps } = useQuery({
    queryKey: ["/api/follow-ups"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Query for follow-up settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/follow-up-settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Calculate stats
  const stats = {
    totalProspects: prospects?.length || 0,
    pendingFollowUps: followUps?.filter((f: any) => !f.completed)?.length || 0,
    overdueFollowUps: 0,
    activeProspects: 0
  };
  
  if (prospects && settings) {
    const now = new Date();
    
    // Count active prospects (contacted within standard follow-up days)
    stats.activeProspects = prospects.filter((prospect: any) => {
      if (!prospect.lastContactDate) return false;
      
      const lastContact = new Date(prospect.lastContactDate);
      const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysSinceLastContact < settings.standardFollowUpDays;
    }).length;
    
    // Count overdue follow-ups
    stats.overdueFollowUps = prospects.filter((prospect: any) => {
      if (!prospect.lastContactDate) return false;
      
      const lastContact = new Date(prospect.lastContactDate);
      const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysSinceLastContact >= settings.standardFollowUpDays;
    }).length;
  }
  
  // Handle prospect selection for follow-up
  const handleProspectSelect = (prospect: any) => {
    setSelectedProspect(prospect);
    setShowFollowUpModal(true);
  };
  
  // Render loading state
  if (isLoadingProspects || isLoadingFollowUps || isLoadingSettings) {
    return (
      <div className="p-6 bg-neutral-200 dark:bg-background h-full overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-neutral-300 dark:bg-neutral-700 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-3 p-3 border border-neutral-300 dark:border-neutral-700 rounded-md">
                  <div className="h-5 bg-neutral-300 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2"></div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-neutral-300 dark:bg-neutral-700 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-3 p-3 border border-neutral-300 dark:border-neutral-700 rounded-md">
                  <div className="h-5 bg-neutral-300 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2"></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-neutral-200 dark:bg-background h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Gmail integration prompt */}
      {!user?.gmailConnected && (
        <Card className="mb-6 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Connect your Gmail account</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Connect your Gmail to automatically track prospect communications and get follow-up reminders.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowGmailModal(true)}>
                Connect Gmail
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            <div className="text-2xl font-bold text-alert">{stats.overdueFollowUps}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-neutral-500">
              <Clock className="h-4 w-4 mr-1 text-alert" />
              <span>Overdue communications</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Active Prospects</CardTitle>
            <div className="text-2xl font-bold text-secondary">{stats.activeProspects}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-neutral-500">
              <BarChart className="h-4 w-4 mr-1 text-secondary" />
              <span>Recently contacted</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prospects Requiring Follow-up */}
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Prospects Requiring Follow-up</CardTitle>
              <Button size="sm" variant="ghost" className="text-xs" asChild>
                <a href="/follow-ups">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </div>
            <CardDescription>
              {stats.overdueFollowUps > 0 
                ? `${stats.overdueFollowUps} prospects need your attention` 
                : "All prospects are up to date"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {prospects?.filter((prospect: any) => {
              if (!prospect.lastContactDate || !settings) return false;
              
              const lastContact = new Date(prospect.lastContactDate);
              const now = new Date();
              const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
              
              return daysSinceLastContact >= settings.standardFollowUpDays;
            }).slice(0, 5).map((prospect: any) => {
              const lastContact = new Date(prospect.lastContactDate);
              const now = new Date();
              const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div 
                  key={prospect.id} 
                  className="p-4 border-b last:border-0 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium mb-1">{prospect.name}</div>
                      <div className="text-xs text-neutral-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Last contact: {formatRelativeTime(prospect.lastContactDate)}</span>
                        <Badge className="ml-2 bg-alert text-white text-xs">
                          {daysSinceLastContact} days overdue
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="text-xs"
                      onClick={() => handleProspectSelect(prospect)}
                    >
                      Follow Up
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {(stats.overdueFollowUps === 0) && (
              <div className="p-6 text-center text-neutral-500">
                <CalendarDays className="h-10 w-10 mx-auto mb-2 text-neutral-400" />
                <p>No prospects currently require follow-up.</p>
                <p className="text-sm mt-1">Great job staying on top of your communications!</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Upcoming Follow-ups */}
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Upcoming Follow-ups</CardTitle>
              <Button size="sm" variant="ghost" className="text-xs" asChild>
                <a href="/follow-ups">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </div>
            <CardDescription>
              Your scheduled follow-up tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {followUps?.filter((f: any) => !f.completed)
              .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .slice(0, 5)
              .map((followUp: any) => (
                <div 
                  key={followUp.id} 
                  className="p-4 border-b last:border-0 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium mb-1">{followUp.prospect.name}</div>
                      <div className="flex items-center mb-1">
                        <Badge className="mr-2 bg-blue-100 text-primary dark:bg-blue-900 dark:text-blue-100 text-xs">
                          {followUp.type === "email" && "Email"}
                          {followUp.type === "call" && "Phone Call"}
                          {followUp.type === "meeting" && "Meeting"}
                        </Badge>
                        <span className="text-xs text-neutral-500">
                          Due: {new Date(followUp.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      {followUp.notes && (
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          {followUp.notes}
                        </div>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => window.location.href = `/prospects?id=${followUp.prospect.id}`}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            
            {(!followUps || followUps.filter((f: any) => !f.completed).length === 0) && (
              <div className="p-6 text-center text-neutral-500">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-neutral-400" />
                <p>No upcoming follow-ups scheduled.</p>
                <p className="text-sm mt-1">Plan your next touchpoints with prospects.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Gmail Integration Modal */}
      <GmailIntegrationModal
        isOpen={showGmailModal}
        onClose={() => setShowGmailModal(false)}
      />
      
      {/* Follow-up Modal */}
      {selectedProspect && (
        <FollowUpModal
          isOpen={showFollowUpModal}
          onClose={() => setShowFollowUpModal(false)}
          prospect={selectedProspect}
        />
      )}
    </div>
  );
}
