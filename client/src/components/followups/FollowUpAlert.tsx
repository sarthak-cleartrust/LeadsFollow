import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowUpAlertProps {
  prospect: any;
  settings: any;
  onFollowUp: () => void;
  onSnooze?: () => void;
}

export default function FollowUpAlert({ prospect, settings, onFollowUp, onSnooze }: FollowUpAlertProps) {
  if (!prospect?.lastContactDate || !settings) {
    return null;
  }
  
  const lastContact = new Date(prospect.lastContactDate);
  const now = new Date();
  const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastContact < settings.standardFollowUpDays) {
    return null;
  }
  
  return (
    <div className="bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-900/50 p-4 flex items-center justify-between">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-alert/10 flex items-center justify-center mr-3">
          <AlertTriangle className="text-alert h-5 w-5" />
        </div>
        <div>
          <div className="font-medium text-alert">Follow-up Required</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {daysSinceLastContact} days since last contact. 
            Your follow-up frequency is set to {settings.standardFollowUpDays} days.
          </div>
        </div>
      </div>
      <div>
        <Button
          className="px-3 py-1.5 bg-alert hover:bg-alert/90 text-white text-sm mr-2"
          onClick={onFollowUp}
        >
          Follow Up Now
        </Button>
        {onSnooze && (
          <Button
            variant="outline"
            className="px-3 py-1.5 border border-neutral-400 text-neutral-600 hover:bg-neutral-100 text-sm"
            onClick={onSnooze}
          >
            Snooze
          </Button>
        )}
      </div>
    </div>
  );
}
