"use client";

type UmamiEventData = Record<string, string | number | boolean | null | undefined>;

declare global {
    interface Window {
        umami?: {
            track: (eventName: string, eventData?: UmamiEventData) => void;
        };
    }
}

export function trackUmamiEvent(eventName: string, eventData?: UmamiEventData) {
    if (typeof window === "undefined" || !window.umami) {
        return;
    }

    window.umami.track(eventName, eventData);
}
