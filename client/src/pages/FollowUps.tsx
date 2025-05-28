import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/gmail";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Check, AlertTriangle, Mail, Phone, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import FollowUpModal from "@/components/modals/FollowUpModal";
import { eventBus, EVENTS } from "@/lib/eventBus";
import { triggerRefresh } from "@/lib/refreshTrigger";

type FollowUpStatus = 'overdue' | 'today' | 'upcoming' | 'completed';

export default function FollowUps() {
  const { toast } = useToast();
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [optimisticFollowUps, setOptimisticFollowUps] = useState<any[]>([]);

  // Query for follow-ups
  const { data: followUps = [], isLoading: isLoadingFollowUps } = useQuery({
    queryKey: ["/api/follow-ups"],
    staleTime: 0,
  });

  // Initialize optimistic state with actual data
  useEffect(() => {
    if (followUps && Array.isArray(followUps) && followUps.length > 0) {
      setOptimisticFollowUps(followUps);
    }
  }, [followUps]);

  // Complete follow-up mutation
  const completeFollowUpMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("PUT", `/api/follow-ups/${id}`, {
        completed,
        completedDate: completed ? new Date().toISOString() : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      toast({
        title: "Follow-up updated",
        description: "Follow-up status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update follow-up",
        variant: "destructive",
      });
    },
  });

  // Update follow-up mutation for drag and drop
  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/follow-ups/${id}`, data);
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/follow-ups"] });

      // Snapshot the previous value
      const previousFollowUps = queryClient.getQueryData(["/api/follow-ups"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/follow-ups"], (old: any) => {
        if (!old) return old;
        return old.map((followUp: any) => 
          followUp.id === id ? { ...followUp, ...data } : followUp
        );
      });

      // Update optimistic state immediately
      setOptimisticFollowUps((old: any) => {
        if (!old) return old;
        return old.map((followUp: any) => 
          followUp.id === id ? { ...followUp, ...data } : followUp
        );
      });

      // Return a context object with the snapshotted value
      return { previousFollowUps };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFollowUps) {
        queryClient.setQueryData(["/api/follow-ups"], context.previousFollowUps);
      }
      toast({
        title: "Error",
        description: "Failed to move follow-up",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
    },
    onSuccess: () => {
      // FORCE IMMEDIATE REFRESH OF DASHBOARD DATA
      queryClient.refetchQueries({ queryKey: ["/api/follow-ups"] });
      queryClient.refetchQueries({ queryKey: ["/api/prospects"] });
      
      toast({
        title: "Follow-up updated",
        description: "Follow-up has been moved successfully.",
      });
    },
  });

  // Utility functions for categorizing follow-ups
  const getFollowUpStatus = (followUp: any): FollowUpStatus => {
    if (followUp.completed) return 'completed';
    
    const today = new Date();
    const dueDate = new Date(followUp.dueDate);
    
    // Reset time to compare just dates
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  // Use useMemo to recalculate categories whenever followUps data changes
  const categorizedFollowUps = useMemo(() => {
    const categories = {
      overdue: [] as any[],
      today: [] as any[],
      upcoming: [] as any[],
      completed: [] as any[]
    };

    const dataToUse = optimisticFollowUps.length > 0 ? optimisticFollowUps : followUps;
    
    if (!dataToUse || !Array.isArray(dataToUse)) {
      return categories;
    }

    console.log("=== CATEGORIZING FOLLOW-UPS ===");
    console.log("Raw followUps data:", dataToUse);
    console.log("Follow-up IDs:", dataToUse.map((f: any) => f.id));

    (dataToUse as any[]).forEach((followUp: any) => {
      const status = getFollowUpStatus(followUp);
      console.log(`Follow-up ${followUp.id}: completed=${followUp.completed}, status=${status}`);
      categories[status].push(followUp);
    });

    console.log("Categories result:", {
      overdue: categories.overdue.length,
      today: categories.today.length,
      upcoming: categories.upcoming.length,
      completed: categories.completed.length
    });

    return categories;
  }, [followUps, optimisticFollowUps]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, followUp: any) => {
    setDraggedItem(followUp);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: FollowUpStatus) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const currentStatus = getFollowUpStatus(draggedItem);
    if (currentStatus === targetStatus) return;

    // Handle moving to completed
    if (targetStatus === 'completed') {
      // Update optimistic state immediately
      const currentData = Array.isArray(followUps) ? followUps : [];
      const baseData = optimisticFollowUps.length > 0 ? optimisticFollowUps : currentData;
      const updatedFollowUps = baseData.map((followUp: any) =>
        followUp.id === draggedItem.id
          ? { ...followUp, completed: true, completedDate: new Date().toISOString() }
          : followUp
      );
      setOptimisticFollowUps(updatedFollowUps);
      
      // FORCE IMMEDIATE REFRESH OF ALL COMPONENTS
      triggerRefresh();
      
      completeFollowUpMutation.mutate({
        id: draggedItem.id,
        completed: true
      });
    }
    // Handle moving from completed to other statuses
    else if (currentStatus === 'completed') {
      // Update optimistic state immediately
      const currentData = Array.isArray(followUps) ? followUps : [];
      const baseData = optimisticFollowUps.length > 0 ? optimisticFollowUps : currentData;
      const updatedFollowUps = baseData.map((followUp: any) =>
        followUp.id === draggedItem.id
          ? { ...followUp, completed: false, completedDate: null }
          : followUp
      );
      setOptimisticFollowUps(updatedFollowUps);
      
      // FORCE IMMEDIATE REFRESH FOR MOVING FROM COMPLETED
      triggerRefresh();
      
      completeFollowUpMutation.mutate({
        id: draggedItem.id,
        completed: false
      });
    }
    // Handle date changes for overdue/today/upcoming
    else {
      const today = new Date();
      let newDueDate: Date;
      
      switch (targetStatus) {
        case 'overdue':
          newDueDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // Yesterday
          break;
        case 'today':
          newDueDate = today;
          break;
        case 'upcoming':
          newDueDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
          break;
        default:
          return;
      }
      
      console.log("=== FRONTEND PAYLOAD ===");
      console.log("draggedItem.id:", draggedItem.id);
      console.log("newDueDate:", newDueDate);
      console.log("newDueDate type:", typeof newDueDate);
      console.log("newDueDate.toISOString():", newDueDate.toISOString());
      
      const payload = { dueDate: newDueDate };
      console.log("Final payload:", payload);
      console.log("Final payload JSON:", JSON.stringify(payload));
      
      // FORCE IMMEDIATE REFRESH FOR DATE CHANGES TOO
      triggerRefresh();
      
      updateFollowUpMutation.mutate({
        id: draggedItem.id,
        data: payload
      });
    }
    
    setDraggedItem(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="w-4 h-4" />;
      case "phone": return <Phone className="w-4 h-4" />;
      case "meeting": return <Video className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getColumnConfig = (status: FollowUpStatus) => {
    switch (status) {
      case 'overdue':
        return {
          title: 'Overdue',
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          bgColor: 'bg-red-50 dark:bg-red-900/10',
          borderColor: 'border-red-200 dark:border-red-800',
          badgeColor: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        };
      case 'today':
        return {
          title: 'Today',
          icon: <Clock className="w-5 h-5 text-orange-500" />,
          bgColor: 'bg-orange-50 dark:bg-orange-900/10',
          borderColor: 'border-orange-200 dark:border-orange-800',
          badgeColor: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
        };
      case 'upcoming':
        return {
          title: 'Upcoming',
          icon: <Calendar className="w-5 h-5 text-blue-500" />,
          bgColor: 'bg-blue-50 dark:bg-blue-900/10',
          borderColor: 'border-blue-200 dark:border-blue-800',
          badgeColor: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
        };
      case 'completed':
        return {
          title: 'Completed',
          icon: <Check className="w-5 h-5 text-green-500" />,
          bgColor: 'bg-green-50 dark:bg-green-900/10',
          borderColor: 'border-green-200 dark:border-green-800',
          badgeColor: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
        };
    }
  };

  const renderFollowUpCard = (followUp: any) => {
    const prospect = followUp.prospect;
    
    return (
      <Card
        key={followUp.id}
        draggable
        onDragStart={(e) => handleDragStart(e, followUp)}
        className="cursor-move hover:shadow-md transition-shadow duration-200 bg-white dark:bg-card"
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getTypeIcon(followUp.type)}
              <span className="text-sm font-medium capitalize">{followUp.type}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {new Date(followUp.dueDate).toLocaleDateString()}
            </Badge>
          </div>
          
          <div className="mb-2">
            <p className="font-medium text-sm">{prospect?.name || 'Unknown Prospect'}</p>
            <p className="text-xs text-muted-foreground">{prospect?.email}</p>
          </div>
          
          {followUp.notes && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {followUp.notes}
            </p>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Due {formatRelativeTime(followUp.dueDate)}
            </span>
            
            {!followUp.completed && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => completeFollowUpMutation.mutate({
                  id: followUp.id,
                  completed: true
                })}
                className="h-6 px-2"
              >
                <Check className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderColumn = (status: FollowUpStatus, followUps: any[]) => {
    const config = getColumnConfig(status);
    
    return (
      <div
        key={status}
        className={cn(
          "rounded-lg border-2 border-dashed p-3",
          config.borderColor,
          config.bgColor
        )}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {config.icon}
            <h3 className="font-semibold text-sm md:text-base">{config.title}</h3>
            <Badge className={cn("text-xs", config.badgeColor)}>
              {followUps.length}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2 max-h-60 md:max-h-80 overflow-y-auto">
          {followUps.map(renderFollowUpCard)}
          
          {followUps.length === 0 && (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <p className="text-sm">No {status} follow-ups</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoadingFollowUps) {
    return (
      <div className="p-6 h-full overflow-y-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Follow-ups</h1>
        <p className="text-muted-foreground">Manage your prospect follow-ups with drag and drop</p>
      </div>

      {/* Responsive grid layout like Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderColumn('overdue', categorizedFollowUps.overdue)}
        {renderColumn('today', categorizedFollowUps.today)}
        {renderColumn('upcoming', categorizedFollowUps.upcoming)}
        {renderColumn('completed', categorizedFollowUps.completed)}
      </div>

      {showFollowUpModal && (
        <FollowUpModal
          isOpen={showFollowUpModal}
          prospect={selectedProspect}
          onClose={() => {
            setShowFollowUpModal(false);
            setSelectedProspect(null);
          }}
        />
      )}
    </div>
  );
}