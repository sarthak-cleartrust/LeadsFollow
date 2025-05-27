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
    <div className="bg-white dark:bg-card rounded-md shadow-sm p-3 md:p-4">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-start min-w-0 flex-1">
          <div className={cn(
            "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-medium mr-2 md:mr-3 text-xs md:text-sm shrink-0",
            isFromProspect 
              ? "bg-blue-100 text-primary dark:bg-blue-900 dark:text-blue-100" 
              : "bg-primary text-white"
          )}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm md:text-base truncate">{formattedName}</div>
            <div className="text-xs text-neutral-500">
              To: {isFromProspect ? "me" : email.toEmail.split("@")[0]}
            </div>
          </div>
        </div>
        <div className="text-xs md:text-sm text-neutral-500 shrink-0">{formattedDate}</div>
      </div>
      
      <div className="pl-10 md:pl-12">
        <div 
          className="flex items-start justify-between font-medium mb-2 cursor-pointer gap-2"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-sm md:text-base min-w-0 flex-1">{email.subject}</span>
          <div className="shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        
        {expanded && (
          <>
            <div className="text-neutral-700 dark:text-neutral-300 mb-4 whitespace-pre-line text-sm md:text-base leading-relaxed">
              {email.content}
            </div>
            
            {/* Attachments would go here if we had them */}
            

          </>
        )}
      </div>
    </div>
  );
}
