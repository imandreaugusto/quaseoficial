self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'Brazilian Friends', {
    body: payload.body || 'Você recebeu uma nova mensagem privada.',
    icon: '/brazilian-in-action-icon.svg',
    badge: '/brazilian-in-action-icon.svg',
    tag: payload.tag || 'brazilian-friends-private-message',
    renotify: true,
    requireInteraction: Boolean(payload.requireInteraction),
    vibrate: payload.requireInteraction ? [350, 180, 350, 180, 600] : [70],
    actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 2) : [],
    data: { url: payload.url || '/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin);
  if (event.action === 'accept' || event.action === 'decline') {
    targetUrl.searchParams.set('callAction', event.action);
  }
  const safeUrl = targetUrl.origin === self.location.origin ? targetUrl.href : `${self.location.origin}/`;

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existingClient = clients.find((client) => 'focus' in client);
    if (existingClient) {
      return existingClient.navigate(safeUrl).then((client) => client?.focus());
    }
    return self.clients.openWindow(safeUrl);
  }));
});
