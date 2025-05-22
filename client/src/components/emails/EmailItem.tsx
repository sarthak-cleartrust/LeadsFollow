import { useState } from "react";
import { formatRelativeTime, getInitials } from "@/lib/gmail";
import { Reply, Forward, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmailItemProps {
  email: any;
}

export default function EmailItem({ email }: EmailItemProps) {
  const [expanded, setExpanded] = useState(true);
  
  // Check if the email is from the user or the prospect
  const isFromProspect = email.fromEmail !== email.toEmail;
  
  // Format the date
  const formattedDate = new Date(email.date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  // Extract name from email address
  const fromName = email.fromEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
  const formattedName = fromName
    .split(' ')
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  
  const initials = getInitials(formattedName);
  
  return (
    <div className="bg-white dark:bg-card rounded-md shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-medium mr-3",
            isFromProspect 
              ? "bg-blue-100 text-primary dark:bg-blue-900 dark:text-blue-100" 
              : "bg-primary text-white"
          )}>
            {initials}
          </div>
          <div>
            <div className="font-medium">{formattedName}</div>
            <div className="text-xs text-neutral-500">
              To: {isFromProspect ? "me" : email.toEmail.split("@")[0]}
            </div>
          </div>
        </div>
        <div className="text-sm text-neutral-500">{formattedDate}</div>
      </div>
      
      <div className="pl-12">
        <div 
          className="flex items-center font-medium mb-2 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="mr-2">{email.subject}</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        
        {expanded && (
          <>
            <div className="text-neutral-700 dark:text-neutral-300 mb-4 whitespace-pre-line">
              {email.content}
            </div>
            
            {/* Attachments would go here if we had them */}
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                className="px-3 py-1.5 border border-primary text-primary hover:bg-blue-50 dark:hover:bg-primary/10 text-sm flex items-center"
              >
                <Reply className="h-4 w-4 mr-1" />
                Reply
              </Button>
              <Button 
                variant="outline" 
                className="px-3 py-1.5 border border-neutral-300 dark:border-border text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-muted text-sm flex items-center"
              >
                <Forward className="h-4 w-4 mr-1" />
                Forward
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
