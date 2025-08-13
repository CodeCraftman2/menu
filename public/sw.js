/* Service Worker for CCode - Web Push Notifications */
self.addEventListener('install', (event) => {
  // Activate new SW immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control immediately
  event.waitUntil(self.clients.claim());
});

// Handle incoming push messages
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // Fallback to text if not JSON
    data = { title: 'CCode', body: event.data && event.data.text ? event.data.text() : 'You have a new notification.' };
  }

  const title = data.title || 'CCode Notification';
  const options = {
    body: data.body || 'You have a new message.',
    icon: data.icon || '/vite.svg',
    badge: data.badge || '/vite.svg',
    data: {
      url: data.url || '/',
      ...data.data
    },
    vibrate: [100, 50, 100],
    requireInteraction: !!data.requireInteraction,
    tag: data.tag || 'ccode-push',
    actions: data.actions || [
      { action: 'open', title: 'Open' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // If a tab is already open, focus it and navigate if needed
          client.focus();
          try {
            if (url && client.url && new URL(client.url).pathname !== new URL(url, self.location.origin).pathname) {
              client.navigate(url);
            }
          } catch (e) {}
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Optional: listen to pushsubscriptionchange to resubscribe
self.addEventListener('pushsubscriptionchange', async (event) => {
  try {
    const appServerKey = (self.__VAPID_PUBLIC_KEY__ && urlBase64ToUint8Array(self.__VAPID_PUBLIC_KEY__)) || null;
    const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
    // We cannot directly call API here without credentials; the page should handle re-syncing the new subscription on next load.
  } catch (e) {
    // Ignore
  }
});

// Utility inside SW for converting VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}