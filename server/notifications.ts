import { storage } from "./storage";
import { User, Prospect, FollowUpSetting } from "@shared/schema";

export interface NotificationAlert {
  type: "follow_up_needed" | "overdue_follow_up" | "new_prospect";
  priority: "high" | "medium" | "low";
  prospect: Prospect;
  message: string;
  daysSinceLastContact: number;
  dueDate?: string;
}

// Check which prospects need follow-ups based on user settings
export async function checkFollowUpNeeds(userId: number): Promise<NotificationAlert[]> {
  const alerts: NotificationAlert[] = [];
  
  // Get user's follow-up settings
  const settings = await storage.getFollowUpSettings(userId);
  if (!settings) {
    return alerts; // No settings configured
  }
  
  // Get all prospects for this user
  const prospects = await storage.getProspectsByUser(userId);
  const now = new Date();
  
  for (const prospect of prospects) {
    // Check if there are any pending follow-ups for this prospect
    const existingFollowUps = await storage.getFollowUpsByProspect(prospect.id);
    const hasPendingFollowUp = existingFollowUps.some(f => !f.completed);
    
    // Skip if there's already a pending follow-up
    if (hasPendingFollowUp) {
      continue;
    }
    
    if (!prospect.lastContactDate) {
      // New prospect with no contact yet
      alerts.push({
        type: "new_prospect",
        priority: "medium",
        prospect,
        message: "New prospect detected - consider reaching out for initial contact",
        daysSinceLastContact: 0
      });
      continue;
    }
    
    const lastContact = new Date(prospect.lastContactDate);
    const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if prospect needs follow-up based on settings
    let needsFollowUp = false;
    let priority: "high" | "medium" | "low" = "low";
    let message = "";
    
    // Determine follow-up schedule based on prospect status and settings
    if (daysSinceLastContact >= settings.standardFollowUpDays) {
      needsFollowUp = true;
      
      if (daysSinceLastContact >= settings.standardFollowUpDays + 7) {
        priority = "high";
        message = `Urgent: No contact for ${daysSinceLastContact} days - immediate follow-up needed`;
      } else if (daysSinceLastContact >= settings.standardFollowUpDays + 3) {
        priority = "medium";
        message = `Overdue: Follow-up needed (${daysSinceLastContact} days since last contact)`;
      } else {
        priority = "low";
        message = `Follow-up recommended (${daysSinceLastContact} days since last contact)`;
      }
    }
    
    if (needsFollowUp) {
      alerts.push({
        type: daysSinceLastContact > settings.standardFollowUpDays + 3 ? "overdue_follow_up" : "follow_up_needed",
        priority,
        prospect,
        message,
        daysSinceLastContact
      });
    }
  }
  
  // Sort alerts by priority (high first)
  alerts.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
  
  return alerts;
}

// Auto-create follow-up tasks for prospects that need them
export async function autoCreateFollowUpTasks(userId: number): Promise<number> {
  const alerts = await checkFollowUpNeeds(userId);
  let tasksCreated = 0;
  
  for (const alert of alerts) {
    if (alert.type === "follow_up_needed" || alert.type === "overdue_follow_up") {
      // Check if there's already a pending follow-up for this prospect
      const existingFollowUps = await storage.getFollowUpsByProspect(alert.prospect.id);
      const hasPendingFollowUp = existingFollowUps.some(f => !f.completed);
      
      if (!hasPendingFollowUp) {
        // Create a new follow-up task
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow
        
        await storage.createFollowUp({
          prospectId: alert.prospect.id,
          title: `Follow up with ${alert.prospect.name}`,
          description: alert.message,
          dueDate,
          priority: alert.priority,
          completed: false
        });
        
        tasksCreated++;
      }
    }
  }
  
  return tasksCreated;
}

// Get notification summary for dashboard
export async function getNotificationSummary(userId: number) {
  const alerts = await checkFollowUpNeeds(userId);
  
  return {
    totalAlerts: alerts.length,
    highPriorityCount: alerts.filter(a => a.priority === "high").length,
    mediumPriorityCount: alerts.filter(a => a.priority === "medium").length,
    lowPriorityCount: alerts.filter(a => a.priority === "low").length,
    newProspectsCount: alerts.filter(a => a.type === "new_prospect").length,
    overdueFollowUpsCount: alerts.filter(a => a.type === "overdue_follow_up").length,
    alerts: alerts.slice(0, 10) // Return top 10 alerts
  };
}