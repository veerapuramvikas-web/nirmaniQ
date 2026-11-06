// sw-custom.js - Custom Service Worker extension for NirmaniQ PWA Push, Badging, and Inline Replies
/* eslint-disable no-restricted-globals */

// ─── 1. PUSH EVENT LISTENER ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'NirmaniQ Construction Alert';
  const body = payload.body || payload.message || 'You have an update in your construction workflow.';
  const type = payload.type || 'general';
  const conversationId = payload.conversationId || payload.data?.conversation_id || '';
  const url = payload.url || (conversationId ? `/issues/${conversationId}` : '/');

  // 1. App Icon Badging
  const badgeCount = Number(payload.badgeCount || payload.unreadCount || 1);
  if ('setAppBadge' in navigator) {
    if (!isNaN(badgeCount) && badgeCount > 0) {
      navigator.setAppBadge(badgeCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  // 2. Action Buttons Definition
  // Note: On platforms supporting text inputs (like Android Chrome), 'reply' enables inline response.
  const actions = [];
  if (type === 'message' || type === 'issue' || conversationId) {
    actions.push({
      action: 'reply',
      title: '💬 Reply',
      type: 'text',
      placeholder: 'Type a reply or update...',
    });
  }
  actions.push({ action: 'open', title: '👁 View' });
  actions.push({ action: 'dismiss', title: '✕ Dismiss' });

  const notificationOptions = {
    body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: `nirmaniq-${type}-${conversationId || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    actions,
    data: {
      url,
      conversationId,
      type,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

// ─── 2. NOTIFICATION CLICK & INLINE REPLY ──────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  if (action === 'dismiss') {
    return;
  }

  // A. Handle Inline OS Reply
  if (action === 'reply') {
    const replyText = (event.reply || '').trim();
    if (replyText && data.conversationId) {
      event.waitUntil(
        (async () => {
          try {
            // Forward inline reply to edge function or storage without opening window
            const functionUrl = self.NIRMANIQ_FUNCTION_URL || 'https://srv1674496.hstgr.cloud/functions/v1/send-push-notification';
            const headers = { 'Content-Type': 'application/json' };
            if (self.NIRMANIQ_AUTH_TOKEN) {
              headers['Authorization'] = `Bearer ${self.NIRMANIQ_AUTH_TOKEN}`;
            }

            await fetch(functionUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                action: 'inline_reply',
                conversation_id: data.conversationId,
                content: replyText,
              }),
            });
          } catch (err) {
            console.error('[SW] Inline reply failed:', err);
          }
        })()
      );
      return;
    }
  }

  // B. Handle View / Click navigation: Focus existing window or open a new one
  event.waitUntil(
    (async () => {
      const fullUrl = new URL(targetUrl, self.location.origin).href;
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of clientList) {
        // If a window is already open on this origin, focus and navigate
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: targetUrl,
            conversationId: data.conversationId,
          });
          if ('navigate' in client && client.url !== fullUrl) {
            await client.navigate(fullUrl);
          }
          await client.focus();
          return;
        }
      }

      // If no window is open, launch new window
      if (self.clients.openWindow) {
        await self.clients.openWindow(fullUrl);
      }
    })()
  );
});

// ─── 3. FOREGROUND BADGING MESSAGES FROM CLIENT TABS ──────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SET_BADGE') {
    const count = Number(event.data.count || 0);
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  } else if (event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  } else if (event.data.type === 'CONFIG_URL') {
    if (event.data.functionUrl) {
      self.NIRMANIQ_FUNCTION_URL = event.data.functionUrl;
    }
    if (event.data.token) {
      self.NIRMANIQ_AUTH_TOKEN = event.data.token;
    }
  }
});
