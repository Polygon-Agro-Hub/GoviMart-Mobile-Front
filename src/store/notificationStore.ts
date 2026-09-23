/**
 * notificationStore.ts
 *
 * Module-level global store for the notification unread count.
 * This is intentionally NOT React state — it persists across tab switches,
 * screen mounts/unmounts, and component re-renders.
 *
 * Pattern borrowed from Sales Dash's ReminderScreen.tsx which works correctly.
 *
 * Usage:
 *   - socketService / pushNotificationService call `updateGlobalUnreadCount(n)`
 *   - Any component calls `subscribeToUnreadCount(cb)` in useEffect and gets
 *     the current count immediately + future updates until it unsubscribes.
 */

let globalUnreadCount = 0;
let unreadCountListeners: ((count: number) => void)[] = [];

/**
 * Subscribe to unread count changes.
 * The listener is called immediately with the current count, then again on every update.
 * Returns an unsubscribe function to call on component cleanup.
 */
export const subscribeToUnreadCount = (listener: (count: number) => void): (() => void) => {
  unreadCountListeners.push(listener);
  // Immediately notify with current value so the badge is correct on mount
  listener(globalUnreadCount);

  return () => {
    unreadCountListeners = unreadCountListeners.filter((l) => l !== listener);
  };
};

/**
 * Update the global unread count and notify all subscribers immediately.
 * Call this from socketService whenever a new notification arrives or
 * the count is refreshed from the API.
 */
export const updateGlobalUnreadCount = (count: number): void => {
  globalUnreadCount = count;
  unreadCountListeners.forEach((listener) => {
    try {
      listener(count);
    } catch (e) {
      // Ignore listener errors
    }
  });
};

/**
 * Get the current unread count synchronously (no subscription).
 */
export const getGlobalUnreadCount = (): number => globalUnreadCount;
