// pushNotification.service.ts - Web Push, App Badging, and Device Subscription Service
import { supabase } from '../lib/supabase';

// Standard VAPID Public Key (Can be overridden via VITE_VAPID_PUBLIC_KEY in .env)
const DEFAULT_VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) || DEFAULT_VAPID_PUBLIC_KEY;

export const FUNCTION_URL =
  (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string) ||
  `${(import.meta.env.VITE_SUPABASE_URL as string || '').replace('.supabase.co', '.supabase.co/functions/v1')}/send-push-notification`;

/**
 * Utility: Convert URL safe base64 to Uint8Array for Web Push subscription
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push and Service Worker are supported in current browser
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if the Badging API is supported
 */
export function isBadgingSupported(): boolean {
  return typeof window !== 'undefined' && 'setAppBadge' in navigator;
}

/**
 * Update the application icon badge with the unread count
 */
export async function setAppBadge(count: number): Promise<void> {
  const num = Math.max(0, count);

  // 1. Direct App Badging API
  if (isBadgingSupported()) {
    try {
      if (num > 0) {
        await (navigator as any).setAppBadge(num);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch {
      // Ignored for platform permission or context limitations
    }
  }

  // 2. Sync to active Service Worker controller
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: num > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
      count: num,
    });
  }
}

/**
 * Clear the application icon badge
 */
export async function clearAppBadge(): Promise<void> {
  return setAppBadge(0);
}

/**
 * Fetch current push subscription if active
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Subscribe the current user device to Web Push notifications
 */
export async function subscribeUserToPush(userId?: string): Promise<{
  success: boolean;
  subscription?: PushSubscription | null;
  error?: string;
}> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported on this browser.' };
  }

  try {
    // 1. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied.' };
    }

    // 2. Get active Service Worker registration & current session
    const registration = await navigator.serviceWorker.ready;
    const { data: { session } } = await supabase.auth.getSession();

    // Send function URL & auth token to SW for background requests
    if (registration.active) {
      registration.active.postMessage({
        type: 'CONFIG_URL',
        functionUrl: FUNCTION_URL,
        token: session?.access_token || '',
      });
    }

    // 3. Obtain or create Push Subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey.buffer as ArrayBuffer,
      });
    }

    // 4. Determine user ID
    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      activeUserId = user?.id;
    }

    // Fallback: check demo user from localStorage
    if (!activeUserId) {
      try {
        const demo = localStorage.getItem('nirmaniq-demo-session');
        if (demo) activeUserId = JSON.parse(demo)?.user?.id;
      } catch {}
    }

    // 5. Store / Upsert in Supabase push_subscriptions table
    if (activeUserId && subscription) {
      const json = subscription.toJSON();
      const endpoint = json.endpoint || '';
      const p256dhKey = json.keys?.p256dh || '';
      const authKey = json.keys?.auth || '';
      const deviceInfo = `${navigator.userAgent.slice(0, 100)} (${navigator.platform || 'device'})`;

      if (endpoint && p256dhKey && authKey) {
        // Upsert by endpoint
        const { error: dbError } = await supabase
          .from('push_subscriptions')
          .upsert(
            {
              user_id: activeUserId,
              endpoint,
              p256dh_key: p256dhKey,
              auth_key: authKey,
              device_info: deviceInfo,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
          );

        if (dbError) {
          console.warn('[PushService] Could not persist push subscription to Supabase:', dbError.message);
        }
      }
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('[PushService] Subscription error:', err);
    return { success: false, error: err.message || 'Failed to subscribe' };
  }
}

/**
 * Unsubscribe current device from Web Push and remove record from Supabase
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);
    }
    await clearAppBadge();
    return true;
  } catch (err) {
    console.error('[PushService] Unsubscribe error:', err);
    return false;
  }
}

/**
 * Trigger a Web Push notification to a specific receiver
 */
export async function triggerPushNotification(params: {
  receiverId: string;
  title: string;
  message: string;
  type?: 'general' | 'issue' | 'material' | 'expense' | 'report';
  url?: string;
  relatedEntityId?: string;
}): Promise<Response> {
  return fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiver_id: params.receiverId,
      title: params.title,
      message: params.message,
      type: params.type || 'general',
      url: params.url || '/',
      related_entity_id: params.relatedEntityId,
    }),
  });
}
