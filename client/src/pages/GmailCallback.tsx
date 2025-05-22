import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function GmailCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  
  // User will be redirected here after Gmail authorization
  
  useEffect(() => {
    // Extract the code from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (!code) {
      toast({
        title: "Authorization Failed",
        description: "No authorization code was received from Google.",
        variant: "destructive",
      });
      setStatus("error");
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        setLocation("/dashboard");
      }, 3000);
      return;
    }

    // Submit the code to the server
    fetch('/api/gmail/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include'
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || 'Failed to connect Gmail');
        });
      }
      return response.json();
    })
    .then(() => {
      toast({
        title: "Gmail Connected Successfully",
        description: "Your Gmail account has been connected to LeadFollow.",
      });
      setStatus("success");
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    })
    .catch(error => {
      console.error('Gmail callback error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "There was a problem connecting your Gmail account.",
        variant: "destructive",
      });
      setStatus("error");
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        setLocation("/dashboard");
      }, 3000);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {status === "processing" && "Connecting Gmail..."}
            {status === "success" && "Gmail Connected!"}
            {status === "error" && "Connection Failed"}
          </h1>
          
          <div className="flex justify-center my-8">
            {status === "processing" && (
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            )}
            {status === "success" && (
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-500 text-2xl">
                ✓
              </div>
            )}
            {status === "error" && (
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-2xl">
                ✗
              </div>
            )}
          </div>
          
          <p className="text-gray-600 dark:text-gray-400">
            {status === "processing" && "Processing your authorization..."}
            {status === "success" && "Redirecting you back to dashboard..."}
            {status === "error" && "You'll be redirected back to try again..."}
          </p>
        </div>
      </div>
    </div>
  );
}