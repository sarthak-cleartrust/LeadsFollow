import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define the response type for auth URL
interface AuthUrlResponse {
  authUrl: string;
}

// Get Gmail auth URL
export function useGmailAuthUrl() {
  return useQuery<AuthUrlResponse>({
    queryKey: ["/api/gmail/auth-url"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Authorize Gmail with code
export function useAuthorizeGmail() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/gmail/callback", { code: code });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Gmail connected successfully",
        description: "Your Gmail account is now connected to LeadFollow.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to connect Gmail",
        description: error.message || "Could not authorize Gmail",
        variant: "destructive",
      });
    }
  });
}

// Sync Gmail emails
export function useSyncGmail() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/gmail/sync");
      return res.json();
    },
    onSuccess: (data) => {
      // Force immediate cache refresh with refetch
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"], type: 'active' });
      toast({
        title: "Gmail sync complete",
        description: `Processed ${data.emailsProcessed} new emails.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gmail sync failed",
        description: error.message || "Could not sync emails",
        variant: "destructive",
      });
    }
  });
}

// Disconnect Gmail integration
export function useDisconnectGmail() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      // Simpler approach that doesn't rely on apiRequest helper
      const response = await fetch("/api/gmail/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to disconnect Gmail");
      }
      
      return data;
    },
    onSuccess: () => {
      // Make sure to invalidate the user data query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Gmail disconnected",
        description: "Your Gmail account has been disconnected successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to disconnect Gmail",
        description: "Could not disconnect your Gmail account. Please try again.",
        variant: "destructive",
      });
    }
  });
}

// Helper to extract email from a formatted string like "John Doe <john@example.com>"
export function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString;
}

// Helper to extract name from a formatted string like "John Doe <john@example.com>"
export function extractName(emailString: string): string {
  const match = emailString.match(/^([^<]+)</);
  return match ? match[1].trim() : emailString.split('@')[0];
}

// Helper to get initials from a name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Format date to relative time (e.g. "2 days ago")
export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return "Today";
  } else if (diffInDays === 1) {
    return "Yesterday";
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
