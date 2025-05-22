import { useMemo } from "react";
import EmailItem from "./EmailItem";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailThreadProps {
  emails: any[];
  isLoading: boolean;
}

export default function EmailThread({ emails, isLoading }: EmailThreadProps) {
  // Sort emails by date (newest first)
  const sortedEmails = useMemo(() => {
    return [...emails].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [emails]);
  
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-card rounded-md shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Skeleton className="w-10 h-10 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20 mt-1" />
                </div>
              </div>
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="pl-12">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex justify-end space-x-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (sortedEmails.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-white dark:bg-card rounded-md shadow-sm p-6 text-center">
          <div className="text-neutral-500 mb-2">No emails found</div>
          <p className="text-sm text-neutral-400">
            There are no email communications with this prospect yet.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      {sortedEmails.map(email => (
        <EmailItem key={email.id} email={email} />
      ))}
    </div>
  );
}
