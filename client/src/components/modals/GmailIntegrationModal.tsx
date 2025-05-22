import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGmailAuthUrl } from "@/lib/gmail";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GmailIntegrationModal({ isOpen, onClose }: GmailIntegrationModalProps) {
  const { toast } = useToast();
  
  // Fetch Gmail auth URL
  const { data: authUrlData, isLoading: isAuthUrlLoading, error: authUrlError } = useGmailAuthUrl();
  
  // Handle getting authorization URL
  const handleGetAuthUrl = () => {
    if (authUrlData?.authUrl) {
      try {
        // Display instructions to the user
        toast({
          title: "Gmail Authorization",
          description: "You'll be redirected to Google to authorize access. After approving, you'll be automatically returned to the app.",
        });
        
        // Redirect the user directly to Google's OAuth page
        window.location.href = authUrlData.authUrl;
      } catch (error) {
        toast({
          title: "Error during authorization",
          description: "There was a problem connecting to Google. Please try again.",
          variant: "destructive",
        });
      }
    } else if (authUrlError) {
      toast({
        title: "Error getting authorization URL",
        description: "There was an error connecting to Gmail. Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Connect Gmail Account</DialogTitle>
          <DialogDescription>
            Connect your Gmail account to automatically track communications with prospects and schedule follow-ups.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-md">
              <h3 className="font-medium mb-2">Benefits of connecting Gmail:</h3>
              <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-400">
                <li>Automatically track emails with prospects</li>
                <li>Get reminders when follow-ups are due</li>
                <li>See all prospect communications in one place</li>
                <li>Never miss an important lead again</li>
              </ul>
            </div>
            
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">
              <h3 className="font-medium mb-2">Your data is secure:</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                LeadFollow only accesses emails related to your prospects and uses them only for displaying within the app.
                We never store full email content in our database.
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleGetAuthUrl} 
            disabled={isAuthUrlLoading || !authUrlData}
          >
            {isAuthUrlLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Connect Gmail"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}