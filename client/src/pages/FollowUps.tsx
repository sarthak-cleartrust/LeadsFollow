import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/gmail";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Check, AlertTriangle, Search, Mail, Phone, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FollowUpModal from "@/components/modals/FollowUpModal";

export default function FollowUps() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  
  // Query for follow-ups
  const { data: followUps, isLoading: isLoadingFollowUps } = useQuery({
    queryKey: ["/api/follow-ups"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Query for prospects that need follow-up but don't have a scheduled task
  const { data: prospects, isLoading: isLoadingProspects } = useQuery({
    queryKey: ["/api/prospects"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Query for follow-up settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/follow-up-settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Mutation to mark follow-up as complete
  const completeFollowUp = useMutation({
    mutationFn: async (followUpId: number) => {
      const res = await apiRequest(
        "PUT", 
        `/api/follow-ups/${followUpId}`, 
        { completed: true, completedDate: new Date().toISOString() }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Follow-up completed",
        description: "The follow-up has been marked as complete.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete follow-up",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle scheduling a follow-up
  const handleScheduleFollowUp = (prospect: any) => {
    setSelectedProspect(prospect);
    setShowFollowUpModal(true);
  };
  
  // Filter and organize follow-ups
  const processedFollowUps = followUps?.filter((followUp: any) => {
    // Filter by search query
    const matchesSearch = 
      followUp.prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      followUp.prospect.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (followUp.notes && followUp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by tab
    const now = new Date();
    const dueDate = new Date(followUp.dueDate);
    const isOverdue = dueDate < now && !followUp.completed;
    const isDueToday = 
      dueDate.getDate() === now.getDate() && 
      dueDate.getMonth() === now.getMonth() && 
      dueDate.getFullYear() === now.getFullYear() && 
      !followUp.completed;
    const isUpcoming = dueDate > now && !followUp.completed;
    const isCompleted = followUp.completed;
    
    let matchesTab = true;
    if (activeTab === "overdue") matchesTab = isOverdue;
    if (activeTab === "today") matchesTab = isDueToday;
    if (activeTab === "upcoming") matchesTab = isUpcoming;
    if (activeTab === "completed") matchesTab = isCompleted;
    
    return matchesSearch && matchesTab;
  });
  
  // Get prospects that need follow-up but don't have scheduled tasks
  const prospectsNeedingFollowUp = prospects?.filter((prospect: any) => {
    if (!prospect.lastContactDate || !settings) return false;
    
    const lastContact = new Date(prospect.lastContactDate);
    const now = new Date();
    const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if this prospect already has a pending follow-up
    const hasFollowUp = followUps?.some((followUp: any) => 
      followUp.prospectId === prospect.id && !followUp.completed
    );
    
    return daysSinceLastContact >= settings.standardFollowUpDays && !hasFollowUp;
  });
  
  // Count items for each tab
  const counts = {
    all: followUps?.filter((f: any) => !f.completed)?.length || 0,
    overdue: followUps?.filter((f: any) => {
      const dueDate = new Date(f.dueDate);
      return dueDate < new Date() && !f.completed;
    })?.length || 0,
    today: followUps?.filter((f: any) => {
      const dueDate = new Date(f.dueDate);
      const now = new Date();
      return dueDate.getDate() === now.getDate() && 
             dueDate.getMonth() === now.getMonth() && 
             dueDate.getFullYear() === now.getFullYear() && 
             !f.completed;
    })?.length || 0,
    upcoming: followUps?.filter((f: any) => {
      const dueDate = new Date(f.dueDate);
      return dueDate > new Date() && !f.completed;
    })?.length || 0,
    completed: followUps?.filter((f: any) => f.completed)?.length || 0
  };
  
  // Loading state
  if (isLoadingFollowUps || isLoadingProspects || isLoadingSettings) {
    return (
      <div className="p-6 bg-neutral-200 dark:bg-background h-full overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Follow-ups</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-neutral-300 dark:bg-neutral-700 rounded w-full mb-4"></div>
          
          <div className="h-12 bg-neutral-300 dark:bg-neutral-700 rounded w-full mb-6"></div>
          
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="mb-4">
              <CardHeader className="pb-2">
                <div className="h-5 bg-neutral-300 dark:bg-neutral-700 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-neutral-200 dark:bg-background h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Follow-ups</h1>
      </div>
      
      <div className="mb-6">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search follow-ups by prospect name or notes..."
            className="w-full pl-9 pr-4 py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All
            <Badge className="ml-2" variant="secondary">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            <Badge className="ml-2 bg-alert text-white">{counts.overdue}</Badge>
          </TabsTrigger>
          <TabsTrigger value="today">
            Today
            <Badge className="ml-2 bg-orange-400 text-white">{counts.today}</Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            <Badge className="ml-2 bg-secondary text-white">{counts.upcoming}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <Badge className="ml-2" variant="outline">{counts.completed}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Prospects needing follow-up but don't have scheduled tasks */}
      {prospectsNeedingFollowUp && prospectsNeedingFollowUp.length > 0 && activeTab !== "completed" && (
        <Card className="mb-6 border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <AlertTriangle className="h-5 w-5 mr-2 text-alert" />
              Prospects Needing Follow-up
            </CardTitle>
            <CardDescription>
              These prospects need follow-up based on your settings but don't have scheduled tasks yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prospectsNeedingFollowUp.map((prospect: any) => {
                const lastContact = new Date(prospect.lastContactDate);
                const now = new Date();
                const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div 
                    key={prospect.id} 
                    className="p-3 border border-neutral-300 dark:border-neutral-700 rounded-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium mb-1">{prospect.name}</div>
                        <div className="text-xs text-neutral-500 flex items-center mb-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Last contact: {formatRelativeTime(prospect.lastContactDate)}</span>
                          <Badge className="ml-2 bg-alert text-white text-xs">
                            {daysSinceLastContact} days overdue
                          </Badge>
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          {prospect.email}
                          {prospect.company && ` • ${prospect.company}`}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="text-xs"
                        onClick={() => handleScheduleFollowUp(prospect)}
                      >
                        Schedule Follow-up
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Scheduled Follow-ups */}
      <div className="space-y-6">
        {activeTab === "overdue" && counts.overdue > 0 && (
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-alert">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Overdue Follow-ups
              </CardTitle>
              <CardDescription>
                These follow-ups are past their due date and require immediate attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processedFollowUps?.filter((f: any) => {
                  const dueDate = new Date(f.dueDate);
                  return dueDate < new Date() && !f.completed;
                }).map((followUp: any) => (
                  <FollowUpCard 
                    key={followUp.id} 
                    followUp={followUp} 
                    onComplete={() => completeFollowUp.mutate(followUp.id)} 
                    isPending={completeFollowUp.isPending}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "today" && counts.today > 0 && (
          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-orange-500">
                <Calendar className="h-5 w-5 mr-2" />
                Today's Follow-ups
              </CardTitle>
              <CardDescription>
                These follow-ups are due today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processedFollowUps?.filter((f: any) => {
                  const dueDate = new Date(f.dueDate);
                  const now = new Date();
                  return dueDate.getDate() === now.getDate() && 
                        dueDate.getMonth() === now.getMonth() && 
                        dueDate.getFullYear() === now.getFullYear() && 
                        !f.completed;
                }).map((followUp: any) => (
                  <FollowUpCard 
                    key={followUp.id} 
                    followUp={followUp} 
                    onComplete={() => completeFollowUp.mutate(followUp.id)} 
                    isPending={completeFollowUp.isPending}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "upcoming" && counts.upcoming > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Calendar className="h-5 w-5 mr-2 text-secondary" />
                Upcoming Follow-ups
              </CardTitle>
              <CardDescription>
                These follow-ups are scheduled for the future.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processedFollowUps?.filter((f: any) => {
                  const dueDate = new Date(f.dueDate);
                  return dueDate > new Date() && !f.completed;
                }).map((followUp: any) => (
                  <FollowUpCard 
                    key={followUp.id} 
                    followUp={followUp} 
                    onComplete={() => completeFollowUp.mutate(followUp.id)} 
                    isPending={completeFollowUp.isPending}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "all" && counts.all > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                All Pending Follow-ups
              </CardTitle>
              <CardDescription>
                All your scheduled follow-ups that haven't been completed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processedFollowUps?.filter((f: any) => !f.completed)
                  .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map((followUp: any) => (
                    <FollowUpCard 
                      key={followUp.id} 
                      followUp={followUp} 
                      onComplete={() => completeFollowUp.mutate(followUp.id)} 
                      isPending={completeFollowUp.isPending}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "completed" && counts.completed > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Check className="h-5 w-5 mr-2 text-secondary" />
                Completed Follow-ups
              </CardTitle>
              <CardDescription>
                Follow-ups you've already completed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processedFollowUps?.filter((f: any) => f.completed)
                  .sort((a: any, b: any) => 
                    new Date(b.completedDate || b.dueDate).getTime() - 
                    new Date(a.completedDate || a.dueDate).getTime()
                  )
                  .map((followUp: any) => (
                    <div 
                      key={followUp.id} 
                      className="p-3 border border-neutral-300 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-900/30"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium mb-1">{followUp.prospect.name}</div>
                          <div className="flex items-center mb-1">
                            <Badge className={cn(
                              "mr-2 text-xs",
                              followUp.type === "email" ? "bg-blue-100 text-primary dark:bg-blue-900 dark:text-blue-100" :
                              followUp.type === "call" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100" :
                              "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100"
                            )}>
                              {followUp.type === "email" && "Email"}
                              {followUp.type === "call" && "Phone Call"}
                              {followUp.type === "meeting" && "Meeting"}
                            </Badge>
                            <span className="text-xs text-neutral-500">
                              Completed: {followUp.completedDate 
                                ? new Date(followUp.completedDate).toLocaleDateString() 
                                : "Unknown"}
                            </span>
                          </div>
                          {followUp.notes && (
                            <div className="text-xs text-neutral-500">
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
                          View Prospect
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Empty state */}
        {(!processedFollowUps || processedFollowUps.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
              <h3 className="text-lg font-medium mb-2">No follow-ups found</h3>
              <p className="text-neutral-500 mb-4">
                {activeTab === "all" && "You don't have any pending follow-ups. Stay on top of your prospect communications!"}
                {activeTab === "overdue" && "Great! You don't have any overdue follow-ups."}
                {activeTab === "today" && "You don't have any follow-ups scheduled for today."}
                {activeTab === "upcoming" && "You don't have any upcoming follow-ups scheduled."}
                {activeTab === "completed" && "You haven't completed any follow-ups yet."}
              </p>
              
              {activeTab !== "completed" && (
                <Button onClick={() => window.location.href = "/prospects"}>
                  View Prospects
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
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

// Follow-up Card Component
function FollowUpCard({ followUp, onComplete, isPending }: { 
  followUp: any, 
  onComplete: () => void,
  isPending: boolean
}) {
  const dueDate = new Date(followUp.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const isToday = 
    dueDate.getDate() === now.getDate() && 
    dueDate.getMonth() === now.getMonth() && 
    dueDate.getFullYear() === now.getFullYear();
  
  return (
    <div 
      className={cn(
        "p-3 border rounded-md",
        isOverdue 
          ? "border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/20" 
          : isToday 
          ? "border-orange-300 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20" 
          : "border-neutral-300 dark:border-neutral-700"
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium mb-1">{followUp.prospect.name}</div>
          <div className="flex items-center mb-1">
            <Badge className={cn(
              "mr-2 text-xs",
              followUp.type === "email" ? "bg-blue-100 text-primary dark:bg-blue-900 dark:text-blue-100" :
              followUp.type === "call" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100" :
              "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100"
            )}>
              {followUp.type === "email" && (
                <><Mail className="h-3 w-3 mr-1" /> Email</>
              )}
              {followUp.type === "call" && (
                <><Phone className="h-3 w-3 mr-1" /> Phone Call</>
              )}
              {followUp.type === "meeting" && (
                <><Video className="h-3 w-3 mr-1" /> Meeting</>
              )}
            </Badge>
            <span className="text-xs text-neutral-500 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {isOverdue ? (
                <span className="text-alert">
                  Overdue: {dueDate.toLocaleDateString()}
                </span>
              ) : isToday ? (
                <span className="text-orange-500">
                  Due today
                </span>
              ) : (
                <span>
                  Due: {dueDate.toLocaleDateString()}
                </span>
              )}
            </span>
          </div>
          {followUp.notes && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              {followUp.notes}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs"
            onClick={() => window.location.href = `/prospects?id=${followUp.prospect.id}`}
          >
            View
          </Button>
          <Button 
            size="sm" 
            className="text-xs"
            onClick={onComplete}
            disabled={isPending}
          >
            {isPending ? "Completing..." : "Complete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
