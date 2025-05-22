import { useState, useEffect } from "react";
import { useGmailAuthUrl, useAuthorizeGmail } from "@/lib/gmail";
import { useAuth } from "@/hooks/useAuth";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GmailIntegrationModal({ isOpen, onClose }: GmailIntegrationModalProps) {
  const { user } = useAuth();
  const [authCode, setAuthCode] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Get Gmail auth URL
  const { data: authUrlData, isLoading: isLoadingUrl } = useGmailAuthUrl();
  const { mutate: authorizeGmail, isPending: isAuthorizing } = useAuthorizeGmail();
  
  // Handle Gmail OAuth process
  const handleConnect = () => {
    if (!authUrlData?.authUrl) return;
    
    // Open the auth URL in a new window
    setIsAuthenticating(true);
    const authWindow = window.open(authUrlData.authUrl, "gmail-auth", "width=600,height=600");
    
    // Function to handle message from the OAuth popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "gmail-oauth-callback" && event.data.code) {
        setAuthCode(event.data.code);
        authorizeGmail(event.data.code);
        setIsAuthenticating(false);
        
        if (authWindow) {
          authWindow.close();
        }
        
        window.removeEventListener("message", handleMessage);
      }
    };
    
    window.addEventListener("message", handleMessage);
  };
  
  // If user is already connected, close the modal
  useEffect(() => {
    if (user?.gmailConnected) {
      onClose();
    }
  }, [user?.gmailConnected, onClose]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Gmail Account</DialogTitle>
          <DialogDescription>
            Connect your Gmail account to enable automatic tracking of prospect communications and follow-up reminders.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-6">
          <div className="border border-neutral-300 dark:border-border rounded-md p-4 bg-neutral-100 dark:bg-muted">
            <div className="flex items-center">
              <img 
                src="https://www.google.com/gmail/about/static/images/logo-gmail.png?cache=1adba63" 
                alt="Gmail logo" 
                className="w-8 h-8 mr-3"
              />
              <div>
                <div className="font-medium">Gmail Integration</div>
                <div className="text-sm text-neutral-500">
                  Access to read and send emails on your behalf
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-neutral-300 dark:border-border pt-4 mb-4">
          <div className="font-medium mb-2">Permissions required:</div>
          <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
            <li className="flex items-center">
              <Check className="h-4 w-4 text-secondary mr-2" />
              Read emails from your inbox
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-secondary mr-2" />
              Send emails on your behalf
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-secondary mr-2" />
              View email metadata (subject, dates, recipients)
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-secondary mr-2" />
              Manage labels for follow-up tracking
            </li>
          </ul>
        </div>
        
        <DialogFooter className="flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            disabled={isLoadingUrl || isAuthenticating || isAuthorizing}
            onClick={handleConnect}
            className="flex items-center"
          >
            <img 
              src="https://www.google.com/gmail/about/static/images/logo-gmail.png?cache=1adba63" 
              alt="Gmail logo" 
              className="w-5 h-5 mr-2" 
            />
            {isLoadingUrl ? "Loading..." : 
             isAuthenticating ? "Authenticating..." : 
             isAuthorizing ? "Connecting..." : 
             "Connect Gmail"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
