// Simple refresh trigger to force component re-renders
let refreshCounter = 0;
const listeners: (() => void)[] = [];

export const triggerRefresh = () => {
  refreshCounter++;
  listeners.forEach(listener => listener());
};

export const useRefreshTrigger = (callback: () => void) => {
  if (!listeners.includes(callback)) {
    listeners.push(callback);
  }
  
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

export const getRefreshKey = () => refreshCounter;