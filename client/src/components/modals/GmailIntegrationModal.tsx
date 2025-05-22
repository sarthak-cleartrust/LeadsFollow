import React, { useState } from "react";
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

interface GmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GmailIntegrationModal({ isOpen, onClose }: GmailIntegrationModalProps) {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  // Fetch Gmail auth URL
  const { data: authUrlData, isLoading: isAuthUrlLoading } = useGmailAuthUrl();
  
  // Authorize Gmail
  const { mutate: authorizeGmail, isPending: isAuthorizing } = useAuthorizeGmail();
  
  // Handle getting authorization URL
  const handleGetAuthUrl = () => {
    if (authUrlData) {
      // Open Gmail auth in a new tab
      window.open(authUrlData, "_blank");
      setShowCodeInput(true);
    }
  };
  
  // Handle authorization code submission
  const handleAuthorize = () => {
    if (authCode.trim()) {
      authorizeGmail(
        { code: authCode.trim() },
        {
          onSuccess: () => {
            onClose();
            window.location.reload(); // Refresh to update UI
          }
        }
      );
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