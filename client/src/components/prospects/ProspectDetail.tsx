import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatRelativeTime, getInitials } from "@/lib/gmail";
import { 
  Edit, 
  Mail, 
  Phone, 
  Clock, 
  ChevronDown, 
  Forward, 
  Reply,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import FollowUpAlert from "@/components/followups/FollowUpAlert";
import FollowUpModal from "@/components/modals/FollowUpModal";
import EmailThread from "@/components/emails/EmailThread";

interface ProspectDetailProps {
  prospectId: number;
}

export default function ProspectDetail({ prospectId }: ProspectDetailProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("emails");
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  
  // Query for prospect details
  const { data: prospect, isLoading: isLoadingProspect } = useQuery({
    queryKey: [`/api/prospects/${prospectId}`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Query for emails
  const { data: emails, isLoading: isLoadingEmails } = useQuery({
    queryKey: [`/api/prospects/${prospectId}/emails`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Query for follow-ups for this prospect
  const { data: followUps, isLoading: isLoadingFollowUps } = useQuery({
    queryKey: [`/api/prospects/${prospectId}/follow-ups`],
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
      queryClient.invalidateQueries({ queryKey: [`/api/prospects/${prospectId}/follow-ups`] });
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
  
  // Check if follow-up is needed based on last contact date and settings
  const needsFollowUp = useMemo(() => {
    if (!prospect?.lastContactDate || !settings) return false;
    
    const lastContact = new Date(prospect.lastContactDate);
    const now = new Date();
    const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceLastContact >= settings.standardFollowUpDays;
  }, [prospect, settings]);
  
  // Get pending (not completed) follow-ups
  const pendingFollowUps = followUps?.filter(f => !f.completed) || [];
  
  // Loading state
  if (isLoadingProspect) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-500">Loading prospect details...</p>
        </div>
      </div>
    );
  }
  
  // No prospect selected
  if (!prospect) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500">Select a prospect to view details</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-neutral-200 dark:bg-background h-full">
      {/* Contact Info Header */}
      <div className="bg-white dark:bg-card p-4 border-b border-neutral-300 dark:border-border flex justify-between">
        <div>
          <h2 className="font-bold text-xl text-foreground">{prospect.name}</h2>
          <div className="text-sm text-neutral-500">
            {prospect.position && `${prospect.position}, `}{prospect.company}
          </div>
          <div className="flex items-center mt-2 space-x-4">
            {prospect.email && (
              <a 
                href={`mailto:${prospect.email}`} 
                className="text-sm text-primary hover:underline flex items-center"
              >
                <Mail className="h-4 w-4 mr-1" />
                {prospect.email}
              </a>
            )}
            {prospect.phone && (
              <a 
                href={`tel:${prospect.phone}`} 
                className="text-sm text-primary hover:underline flex items-center"
              >
                <Phone className="h-4 w-4 mr-1" />
                {prospect.phone}
              </a>
            )}
          </div>
        </div>
        

      </div>
      
      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-card border-b border-neutral-300 dark:border-border px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="px-0">
            <TabsTrigger 
              value="emails" 
              className="px-4 py-3 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-primary rounded-none"
            >
              Communication History
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="px-4 py-3 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-primary rounded-none"
            >
              Notes
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="px-4 py-3 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-primary rounded-none"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="px-4 py-3 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-primary rounded-none"
            >
              Details
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Follow-up Alert */}
      {needsFollowUp && (
        <FollowUpAlert 
          prospect={prospect} 
          settings={settings}
          onFollowUp={() => setShowFollowUpModal(true)}
        />
      )}
      
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "emails" && (
          <EmailThread 
            emails={emails || []}
            isLoading={isLoadingEmails}
          />
        )}
        
        {activeTab === "notes" && (
          <div className="p-4">
            <div className="bg-white dark:bg-card rounded-md shadow-sm p-4">
              <h3 className="font-medium mb-3">Notes</h3>
              <p className="text-neutral-500 text-sm">No notes yet. Add your first note below.</p>
              <textarea 
                className="w-full mt-3 p-3 border border-neutral-300 dark:border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                rows={4}
                placeholder="Add notes about this prospect..."
              ></textarea>
              <div className="flex justify-end mt-3">
                <Button size="sm">Save Note</Button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "tasks" && (
          <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-card rounded-md shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Follow-up Tasks</h3>
                <Button 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setShowFollowUpModal(true)}
                >
                  Schedule Follow-up
                </Button>
              </div>
              
              {isLoadingFollowUps ? (
                <div className="text-center py-4">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-neutral-500 text-sm">Loading follow-ups...</p>
                </div>
              ) : pendingFollowUps.length === 0 ? (
                <p className="text-neutral-500 text-sm">No scheduled follow-ups.</p>
              ) : (
                <div className="space-y-3">
                  {pendingFollowUps.map(followUp => (
                    <div 
                      key={followUp.id} 
                      className="border border-neutral-300 dark:border-border rounded-md p-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center mb-1">
                            <span className="font-medium text-sm">
                              {followUp.type === "email" && "Email Follow-up"}
                              {followUp.type === "call" && "Phone Call"}
                              {followUp.type === "meeting" && "Meeting"}
                            </span>
                            <span className="ml-2 text-xs text-neutral-500">
                              Due: {new Date(followUp.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                          {followUp.notes && (
                            <p className="text-sm text-neutral-600">{followUp.notes}</p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs ml-2"
                          onClick={() => completeFollowUp.mutate(followUp.id)}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === "details" && (
          <div className="p-4">
            <div className="bg-white dark:bg-card rounded-md shadow-sm p-4">
              <h3 className="font-medium mb-3">Prospect Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Full Name</div>
                    <div className="text-sm">{prospect.name || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Email</div>
                    <div className="text-sm">{prospect.email || "Not specified"}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Company</div>
                    <div className="text-sm">{prospect.company || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Position</div>
                    <div className="text-sm">{prospect.position || "Not specified"}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Phone</div>
                    <div className="text-sm">{prospect.phone || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Category</div>
                    <div className="text-sm">{prospect.category || "Not specified"}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Last Contact</div>
                  <div className="text-sm">
                    {prospect.lastContactDate 
                      ? formatRelativeTime(prospect.lastContactDate) 
                      : "No contact yet"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Follow-up Modal */}
      <FollowUpModal 
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        prospect={prospect}
      />
    </div>
  );
}
