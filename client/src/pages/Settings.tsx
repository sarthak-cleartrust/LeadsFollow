import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useGmailAuthUrl, useSyncGmail, useDisconnectGmail } from "@/lib/gmail";
import { apiRequest } from "@/lib/queryClient";
import { NotificationService, startNotificationService, stopNotificationService } from "@/lib/notifications";
import {
  Cog,
  MailCheck,
  Bell,
  Clock,
  RefreshCw,
  Check,
  X,
  LogOut
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import GmailIntegrationModal from "@/components/modals/GmailIntegrationModal";
import FollowUpRulesModal from "@/components/modals/FollowUpRulesModal";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [showFollowUpRulesModal, setShowFollowUpRulesModal] = useState(false);
  const [isManualDisconnecting, setIsManualDisconnecting] = useState(false);
  
  const { mutate: syncGmail, isPending: isSyncing } = useSyncGmail();
  const { mutate: disconnectGmail, isPending: isDisconnecting } = useDisconnectGmail();
  
  // Mutation for updating notification settings
  const updateNotificationSettings = useMutation({
    mutationFn: async (data: { notifyBrowser: boolean }) => {
      const response = await fetch("/api/follow-up-settings", {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-settings"] });
      toast({
        title: "Settings updated",
        description: "Notification preferences have been saved."
      });
    },
    onError: () => {
      toast({
        title: "Error updating settings",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  });
  
  // Query for follow-up settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/follow-up-settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Format last sync time from user data
  const lastSyncTime = user?.lastSyncDate 
    ? new Date(user.lastSyncDate).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(',', ',')
    : "Never";

  // Handle browser notification toggle
  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      // Request permission for browser notifications
      const hasPermission = await NotificationService.requestPermission();
      if (hasPermission) {
        updateNotificationSettings.mutate({ notifyBrowser: true });
        startNotificationService();
        toast({
          title: "Browser notifications enabled",
          description: "You'll now receive notifications for overdue and upcoming follow-ups."
        });
      } else {
        toast({
          title: "Permission denied",
          description: "Please allow notifications in your browser settings to enable this feature.",
          variant: "destructive"
        });
      }
    } else {
      updateNotificationSettings.mutate({ notifyBrowser: false });
      stopNotificationService();
      toast({
        title: "Browser notifications disabled",
        description: "You will no longer receive browser notifications."
      });
    }
  };
  
  return (
    <div className="p-6 bg-neutral-200 dark:bg-background h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="general" className="flex items-center">
              <Cog className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center">
              <MailCheck className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="followups" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Follow-ups
            </TabsTrigger>
          </TabsList>
          
          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account information and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-neutral-500">Full Name</Label>
                        <div className="font-medium">{user?.fullName}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-neutral-500">Email</Label>
                        <div className="font-medium">{user?.email}</div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-neutral-500">Username</Label>
                      <div className="font-medium">{user?.username}</div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Account Actions</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Change Password</div>
                        <div className="text-sm text-neutral-500">Update your account password</div>
                      </div>
                      <Button variant="outline">Change Password</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Update Email</div>
                        <div className="text-sm text-neutral-500">Change your email address</div>
                      </div>
                      <Button variant="outline">Update Email</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-red-600 dark:text-red-400">Logout</div>
                        <div className="text-sm text-neutral-500">Sign out of your account</div>
                      </div>
                      <Button 
                        variant="destructive"
                        onClick={() => logout()}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Integrations Settings */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Email Integrations</CardTitle>
                <CardDescription>
                  Connect your email accounts to track prospect communications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <img 
                        src="https://www.google.com/gmail/about/static/images/logo-gmail.png?cache=1adba63" 
                        alt="Gmail logo" 
                        className="w-8 h-8 mr-3" 
                      />
                      <div>
                        <div className="font-medium">Gmail</div>
                        <div className="text-sm text-neutral-500">
                          {user?.gmailConnected 
                            ? `Connected to ${user.email}` 
                            : "Not connected"}
                        </div>
                      </div>
                    </div>
                    
                    {user?.gmailConnected ? (
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-neutral-500">
                          Last synced: {lastSyncTime}
                        </div>
                        <Button 
                          variant="outline" 
                          className="flex items-center"
                          onClick={() => syncGmail()}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? "Syncing..." : "Sync Now"}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            // Direct implementation for better reliability
                            setIsManualDisconnecting(true);
                            
                            fetch("/api/gmail/disconnect", {
                              method: "POST",
                              credentials: "include",
                              headers: {
                                "Content-Type": "application/json"
                              }
                            })
                            .then(res => {
                              if (!res.ok) {
                                throw new Error("Failed to disconnect Gmail");
                              }
                              return res.json();
                            })
                            .then(() => {
                              // Force reload to ensure UI updates completely
                              window.location.reload();
                            })
                            .catch(err => {
                              console.error("Error disconnecting Gmail:", err);
                              toast({
                                title: "Error disconnecting Gmail",
                                description: "Please try again later",
                                variant: "destructive"
                              });
                            })
                            .finally(() => {
                              setIsManualDisconnecting(false);
                            });
                          }}
                          disabled={isManualDisconnecting || isDisconnecting}
                        >
                          {isManualDisconnecting || isDisconnecting ? "Disconnecting..." : "Disconnect"}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setShowGmailModal(true)}>
                        Connect Gmail
                      </Button>
                    )}
                  </div>
                  
                  {user?.gmailConnected && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-md text-sm">
                      <h4 className="font-medium mb-2">Gmail Integration Permissions</h4>
                      <ul className="space-y-1">
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-secondary mr-2" />
                          Reading emails from your inbox
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-secondary mr-2" />
                          Sending emails on your behalf
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-secondary mr-2" />
                          Accessing email metadata (subject, dates, recipients)
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-secondary mr-2" />
                          Managing labels for follow-up tracking
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center text-white mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                          <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Outlook</div>
                        <div className="text-sm text-neutral-500">Not connected</div>
                      </div>
                    </div>
                    
                    <Button variant="outline">
                      Coming Soon
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how and when you want to be notified about prospect activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Browser Notifications</div>
                        <div className="text-sm text-neutral-500">Receive notifications in your browser when follow-ups are due</div>
                      </div>
                      <Switch
                        checked={settings?.notifyBrowser || false}
                        disabled={isLoadingSettings}
                        onCheckedChange={handleBrowserNotificationToggle}
                      />
                    </div>
                    
                    {settings?.notifyBrowser && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
                        <div className="flex items-center mb-2">
                          <Bell className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="font-medium text-blue-700 dark:text-blue-300">Browser notifications enabled</span>
                        </div>
                        <p className="text-blue-600 dark:text-blue-400">
                          You'll receive browser notifications for overdue follow-ups and upcoming tasks.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Events</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Follow-up Reminders</div>
                        <div className="text-sm text-neutral-500">Get notified about upcoming and overdue follow-ups</div>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">New Email from Prospect</div>
                        <div className="text-sm text-neutral-500">Get notified when a prospect emails you</div>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Follow-up Settings */}
          <TabsContent value="followups">
            <Card>
              <CardHeader>
                <CardTitle>Follow-up Rules</CardTitle>
                <CardDescription>
                  Configure when and how you want to follow up with prospects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingSettings ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
                    <div className="h-20 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
                    <div className="h-20 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg p-4">
                      <h3 className="font-medium mb-3">Default Follow-up Timeline</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Initial Response</div>
                            <div className="text-sm text-neutral-500">After first contact with prospect</div>
                          </div>
                          <div className="text-lg font-medium">
                            {settings?.initialResponseDays || 2} days
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Standard Follow-up</div>
                            <div className="text-sm text-neutral-500">After last communication</div>
                          </div>
                          <div className="text-lg font-medium">
                            {settings?.standardFollowUpDays || 4} days
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg p-4">
                      <h3 className="font-medium mb-3">Priority Rules</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                            <span>High Priority</span>
                          </div>
                          <div>
                            Overdue by {settings?.highPriorityDays || 3}+ days
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
                            <span>Medium Priority</span>
                          </div>
                          <div>
                            {settings?.mediumPriorityDays === 0 
                              ? "Due today" 
                              : settings?.mediumPriorityDays === 1 
                              ? "Due tomorrow" 
                              : `Due in ${settings?.mediumPriorityDays || 1} days`}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                            <span>Low Priority</span>
                          </div>
                          <div>
                            Due in next {settings?.lowPriorityDays || 3} days
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={() => setShowFollowUpRulesModal(true)}>
                  Customize Follow-up Rules
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Gmail Integration Modal */}
      <GmailIntegrationModal
        isOpen={showGmailModal}
        onClose={() => setShowGmailModal(false)}
      />
      
      {/* Follow-up Rules Modal */}
      <FollowUpRulesModal
        isOpen={showFollowUpRulesModal}
        onClose={() => setShowFollowUpRulesModal(false)}
      />
    </div>
  );
}
