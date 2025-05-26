import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/gmail";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProspectStatus {
  id: number;
  name: string;
  email: string;
  company?: string;
  position?: string;
  category?: string;
  lastContactDate?: string;
  status: string;
}

interface ProspectListProps {
  selectedProspectId?: number;
  onSelectProspect: (prospect: ProspectStatus) => void;
  onAddProspect: () => void;
}

export default function ProspectList({ selectedProspectId, onSelectProspect, onAddProspect }: ProspectListProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Query for prospects
  const { data: prospects, isLoading } = useQuery({
    queryKey: ["/api/prospects"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Query for follow-up settings to determine needed follow-ups
  const { data: settings } = useQuery({
    queryKey: ["/api/follow-up-settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Process prospects with status info
  const processedProspects = prospects?.map((prospect: any) => {
    let statusInfo = { status: "active", label: "Active", color: "text-secondary" };
    
    if (prospect.lastContactDate && settings) {
      const lastContact = new Date(prospect.lastContactDate);
      const now = new Date();
      const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastContact >= settings.standardFollowUpDays) {
        statusInfo = { 
          status: "follow-up", 
          label: "Follow-up needed", 
          color: "text-alert" 
        };
      } else if (daysSinceLastContact >= settings.standardFollowUpDays - 1) {
        statusInfo = { 
          status: "follow-up-soon", 
          label: "Follow-up today", 
          color: "text-alert" 
        };
      }
    }
    
    return {
      ...prospect,
      statusInfo
    };
  }) || [];
  
  // Filter prospects based on search and status
  const filteredProspects = processedProspects.filter((prospect: any) => {
    const matchesSearch = 
      prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prospect.company && prospect.company.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "new" && !prospect.lastContactDate) ||
      (statusFilter === "follow-up" && prospect.statusInfo.status === "follow-up") ||
      (statusFilter === "active" && prospect.statusInfo.status === "active");
    
    return matchesSearch && matchesStatus;
  });
  
  // Get counts for each status
  const prospectCounts = {
    all: processedProspects.length,
    new: processedProspects.filter((p: any) => !p.lastContactDate).length,
    "follow-up": processedProspects.filter((p: any) => ["follow-up", "follow-up-soon"].includes(p.statusInfo.status)).length,
    active: processedProspects.filter((p: any) => p.statusInfo.status === "active").length
  };
  
  return (
    <div className="w-80 border-r border-neutral-300 dark:border-border bg-white dark:bg-card flex flex-col h-full">
      <div className="p-4 border-b border-neutral-300 dark:border-border">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search prospects..."
            className="w-full pl-9 pr-4 py-2 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm font-medium text-foreground">
            {prospectCounts.all} Active Prospects
          </div>
          <Button 
            size="sm" 
            className="text-xs bg-primary hover:bg-primary/90 text-white flex items-center"
            onClick={onAddProspect}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
        
        <div className="flex items-center space-x-2 mt-3">
          <Button 
            variant={statusFilter === "all" ? "default" : "outline"} 
            size="sm" 
            className={cn(
              "text-xs px-2 py-1", 
              statusFilter === "all" ? "bg-blue-100 hover:bg-blue-200 text-primary border-blue-200" : ""
            )}
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button 
            variant={statusFilter === "new" ? "default" : "outline"} 
            size="sm" 
            className={cn(
              "text-xs px-2 py-1", 
              statusFilter === "new" ? "bg-blue-100 hover:bg-blue-200 text-primary border-blue-200" : ""
            )}
            onClick={() => setStatusFilter("new")}
          >
            New
          </Button>
          <Button 
            variant={statusFilter === "follow-up" ? "default" : "outline"} 
            size="sm" 
            className={cn(
              "text-xs px-2 py-1", 
              statusFilter === "follow-up" ? "bg-blue-100 hover:bg-blue-200 text-primary border-blue-200" : ""
            )}
            onClick={() => setStatusFilter("follow-up")}
          >
            Follow-up
          </Button>
          <Button 
            variant={statusFilter === "active" ? "default" : "outline"} 
            size="sm" 
            className={cn(
              "text-xs px-2 py-1", 
              statusFilter === "active" ? "bg-blue-100 hover:bg-blue-200 text-primary border-blue-200" : ""
            )}
            onClick={() => setStatusFilter("active")}
          >
            Active
          </Button>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 border-b border-neutral-300 dark:border-border">
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-48 mb-2" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            </div>
          ))
        ) : filteredProspects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            <div className="text-neutral-500 mb-2">No prospects found</div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onAddProspect}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add a prospect
            </Button>
          </div>
        ) : (
          filteredProspects.map((prospect: any) => (
            <div 
              key={prospect.id}
              className={cn(
                "p-3 border-b border-neutral-300 dark:border-border hover:bg-blue-50 dark:hover:bg-primary/10 cursor-pointer transition-standard",
                selectedProspectId === prospect.id ? "bg-blue-50 dark:bg-primary/10" : ""
              )}
              onClick={() => onSelectProspect(prospect)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium">{prospect.name}</div>
                <div className={cn("text-xs font-medium", prospect.statusInfo.color)}>
                  {prospect.statusInfo.label}
                </div>
              </div>
              <div className="text-xs text-neutral-500 mb-2">{prospect.email}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-neutral-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    {prospect.lastContactDate 
                      ? `Last contact: ${formatRelativeTime(prospect.lastContactDate)}` 
                      : "No contact yet"}
                  </span>
                </div>
                {prospect.category && (
                  <Badge className="text-xs px-2 py-0.5 bg-blue-100 text-primary">
                    {prospect.category}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
