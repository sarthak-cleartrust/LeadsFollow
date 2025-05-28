// Browser notifications service
export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static isSupported(): boolean {
    return 'Notification' in window;
  }

  static hasPermission(): boolean {
    return Notification.permission === 'granted';
  }

  static showNotification(title: string, options?: NotificationOptions) {
    console.log('=== SHOWING NOTIFICATION ===');
    console.log('Title:', title);
    console.log('Supported:', this.isSupported());
    console.log('Has Permission:', this.hasPermission());
    
    if (!this.isSupported() || !this.hasPermission()) {
      console.log('Cannot show notification - no support or permission');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
      console.log('Notification created successfully:', notification);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  static showFollowUpNotification(prospect: string, type: 'overdue' | 'due_today' | 'upcoming') {
    const titles = {
      overdue: `Overdue Follow-up: ${prospect}`,
      due_today: `Follow-up Due Today: ${prospect}`,
      upcoming: `Upcoming Follow-up: ${prospect}`
    };

    const bodies = {
      overdue: 'This follow-up is overdue and needs your attention.',
      due_today: 'You have a follow-up scheduled for today.',
      upcoming: 'You have an upcoming follow-up scheduled.'
    };

    return this.showNotification(titles[type], {
      body: bodies[type],
      tag: `followup-${prospect}`, // Prevents duplicate notifications
      requireInteraction: type === 'overdue', // Keep overdue notifications visible until clicked
    });
  }
}

// Check for overdue follow-ups and show notifications
export async function checkAndNotifyFollowUps() {
  console.log('=== CHECKING FOLLOW-UPS FOR NOTIFICATIONS ===');
  
  if (!NotificationService.hasPermission()) {
    console.log('No notification permission, skipping check');
    return;
  }

  try {
    console.log('Fetching follow-ups...');
    const response = await fetch('/api/follow-ups', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.log('API response not ok:', response.status);
      return;
    }
    
    const followUps = await response.json();
    console.log('Fetched follow-ups:', followUps.length);
    
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    followUps.forEach((followUp: any) => {
      console.log(`Checking follow-up ${followUp.id}:`, {
        prospect: followUp.prospect?.name,
        dueDate: followUp.dueDate,
        completed: followUp.completed
      });
      
      if (followUp.completed) {
        console.log(`Follow-up ${followUp.id} is completed, skipping`);
        return;
      }
      
      const dueDate = new Date(followUp.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Follow-up ${followUp.id} diff days:`, diffDays);
      
      if (diffDays < 0) {
        // Overdue
        console.log(`Showing OVERDUE notification for ${followUp.prospect?.name}`);
        NotificationService.showFollowUpNotification(
          followUp.prospect?.name || 'Unknown',
          'overdue'
        );
      } else if (diffDays === 0) {
        // Due today
        console.log(`Showing DUE TODAY notification for ${followUp.prospect?.name}`);
        NotificationService.showFollowUpNotification(
          followUp.prospect?.name || 'Unknown',
          'due_today'
        );
      } else {
        console.log(`Follow-up ${followUp.id} is upcoming (${diffDays} days), no notification`);
      }
    });
  } catch (error) {
    console.error('Error checking follow-ups for notifications:', error);
  }
}

// Set up periodic notification checks
let notificationInterval: NodeJS.Timeout | null = null;
let serviceStarted = false;

export function startNotificationService() {
  if (!NotificationService.isSupported() || !NotificationService.hasPermission()) {
    return;
  }

  // Only start if not already running
  if (serviceStarted && notificationInterval) {
    console.log('Notification service already running, skipping restart');
    return;
  }

  // Clear any existing interval first
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
  
  // Set up 30-minute interval (30 * 60 * 1000 = 1,800,000 ms)
  console.log('Setting up 30-minute notification interval (1,800,000 ms)');
  notificationInterval = setInterval(checkAndNotifyFollowUps, 30 * 60 * 1000);
  serviceStarted = true;
  
  // Check immediately
  checkAndNotifyFollowUps();
}

export function stopNotificationService() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
    serviceStarted = false;
    console.log('Notification service stopped');
  }
}