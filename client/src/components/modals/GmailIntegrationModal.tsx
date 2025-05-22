import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGmailAuthUrl, useAuthorizeGmail } from "@/lib/gmail";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GmailIntegrationModal({ isOpen, onClose }: GmailIntegrationModalProps) {
  const [authCode, setAuthCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const { toast } = useToast();
  
  // Fetch Gmail auth URL
  const { data: authUrlData, isLoading: isAuthUrlLoading, error: authUrlError } = useGmailAuthUrl();
  
  // Authorize Gmail
  const { mutate: authorizeGmail, isPending: isAuthorizing } = useAuthorizeGmail();
  
  // Handle getting authorization URL
  const handleGetAuthUrl = () => {
    if (authUrlData?.authUrl) {
      try {
        // Display instructions to the user
        toast({
          title: "Gmail Authorization Redirect",
          description: "You'll be redirected to Google to authorize access. After approving, you'll be automatically returned to the app.",
        });
        
        // Instead of opening in a new tab, redirect the user directly
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
  
  // Handle authorization code submission
  const handleAuthorize = () => {
    if (authCode.trim()) {
      authorizeGmail(authCode.trim(), {
        onSuccess: () => {
          toast({
            title: "Gmail connected successfully",
            description: "Your Gmail account is now connected to LeadFollow",
          });
          onClose();
          window.location.reload(); // Refresh to update UI
        },
        onError: (error) => {
          toast({
            title: "Error connecting Gmail",
            description: error.message || "There was an error connecting your Gmail account",
            variant: "destructive",
          });
        }
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
          {!showCodeInput ? (
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
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                <h3 className="font-medium mb-2">Enter authorization code:</h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-3">
                  After authorizing in Google, you'll receive a code. Copy and paste it here:
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md mb-3 text-xs">
                  <strong>Note:</strong> If you see "This site can't be reached" after allowing access, don't worry. 
                  Look in your browser's address bar - you'll find the authorization code there after "code=" and before any "&" character.
                </div>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste authorization code here"
                />
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between">
          {!showCodeInput ? (
            <>
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
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowCodeInput(false)}>
                Back
              </Button>
              <Button 
                onClick={handleAuthorize} 
                disabled={!authCode.trim() || isAuthorizing}
              >
                {isAuthorizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Authorize"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}