// src/lib/gtag.ts
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

// Log the page view
export const pageview = (url: URL | string): void => {
  if (!GA_MEASUREMENT_ID) return; // Don't run if ID is not set
  if (typeof window.gtag !== 'function') {
    console.warn('gtag function not found. GA might be blocked or not loaded.');
    return;
  }
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

// Log specific events
interface GtagEvent {
  action: string;
  category: string;
  label: string;
  value?: number; // Optional value
  [key: string]: any; // Allow other parameters
}

export const event = ({ action, category, label, value, ...rest }: GtagEvent): void => {
   if (!GA_MEASUREMENT_ID) return; // Don't run if ID is not set
   if (typeof window.gtag !== 'function') {
     console.warn('gtag function not found. GA might be blocked or not loaded.');
     return;
   }
   window.gtag('event', action, {
     event_category: category,
     event_label: label,
     value: value,
     ...rest, // Send any other parameters
   });
};

// Helper to set user properties (like user_id)
export const setUserId = (userId: string | null): void => {
    if (!GA_MEASUREMENT_ID || !userId) return;
    if (typeof window.gtag !== 'function') {
      console.warn('gtag function not found. GA might be blocked or not loaded.');
      return;
    }
    window.gtag('config', GA_MEASUREMENT_ID, {
        user_id: userId
    });
    console.log(`GA User ID set: ${userId}`); // For debugging
}; 