import { useState } from "react";
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

type FollowUpStatus = 'overdue' | 'today' | 'upcoming' | 'completed';

export default function FollowUps() {
  const { toast } = useToast();
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);

  // Query for follow-ups
  const { data: followUps = [], isLoading: isLoadingFollowUps } = useQuery({
    queryKey: ["/api/follow-ups"],
    staleTime: 60 * 1000,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
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

  const categorizeFollowUps = () => {
    const categories = {
      overdue: [] as any[],
      today: [] as any[],
      upcoming: [] as any[],
      completed: [] as any[]
    };

    (followUps as any[]).forEach((followUp: any) => {
      const status = getFollowUpStatus(followUp);
      categories[status].push(followUp);
    });

    return categories;
  };

  const categorizedFollowUps = categorizeFollowUps();

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
      completeFollowUpMutation.mutate({
        id: draggedItem.id,
        completed: true
      });
    }
    // Handle moving from completed to other statuses
    else if (currentStatus === 'completed') {
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
      
      updateFollowUpMutation.mutate({
        id: draggedItem.id,
        data: { dueDate: newDueDate.toISOString() }
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
          "flex-1 min-w-60 max-w-64 rounded-lg border-2 border-dashed p-3",
          config.borderColor,
          config.bgColor
        )}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {config.icon}
            <h3 className="font-semibold">{config.title}</h3>
            <Badge className={cn("text-xs", config.badgeColor)}>
              {followUps.length}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {followUps.map(renderFollowUpCard)}
          
          {followUps.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No {status} follow-ups</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoadingFollowUps) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-neutral-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="text-muted-foreground">Manage your prospect follow-ups with drag and drop</p>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
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