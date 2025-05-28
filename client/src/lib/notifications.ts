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
    if (!this.isSupported() || !this.hasPermission()) {
      return null;
    }

    return new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
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
  if (!NotificationService.hasPermission()) {
    return;
  }

  try {
    const response = await fetch('/api/follow-ups', {
      credentials: 'include'
    });
    
    if (!response.ok) return;
    
    const followUps = await response.json();
    const now = new Date();
    
    followUps.forEach((followUp: any) => {
      if (followUp.completed) return;
      
      const dueDate = new Date(followUp.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        // Overdue
        NotificationService.showFollowUpNotification(
          followUp.prospect?.name || 'Unknown',
          'overdue'
        );
      } else if (diffDays === 0) {
        // Due today
        NotificationService.showFollowUpNotification(
          followUp.prospect?.name || 'Unknown',
          'due_today'
        );
      }
    });
  } catch (error) {
    console.error('Error checking follow-ups for notifications:', error);
  }
}

// Set up periodic notification checks
let notificationInterval: NodeJS.Timeout | null = null;

export function startNotificationService() {
  if (!NotificationService.isSupported() || !NotificationService.hasPermission()) {
    return;
  }

  // Check every 1 minute for testing
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }
  
  notificationInterval = setInterval(checkAndNotifyFollowUps, 1 * 60 * 1000);
  
  // Check immediately
  checkAndNotifyFollowUps();
}

export function stopNotificationService() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}