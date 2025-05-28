// Event Bus for managing application-wide state changes
type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  // Subscribe to an event
  subscribe(eventName: string, callback: EventCallback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit an event
  emit(eventName: string, ...args: any[]) {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  // Clear all subscribers for an event
  clear(eventName?: string) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }
}

// Create a singleton instance
export const eventBus = new EventBus();

// Event names
export const EVENTS = {
  FOLLOW_UPS_UPDATED: 'follow-ups-updated',
  PROSPECTS_UPDATED: 'prospects-updated',
  NOTIFICATION_UPDATE: 'notification-update'
} as const;