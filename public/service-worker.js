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
    tag: 'brazilian-friends-private-message',
    renotify: true,
    vibrate: [70],
    data: { url: payload.url || '/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin);
  const safeUrl = targetUrl.origin === self.location.origin ? targetUrl.href : `${self.location.origin}/`;

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existingClient = clients.find((client) => 'focus' in client);
    if (existingClient) {
      return existingClient.navigate(safeUrl).then((client) => client?.focus());
    }
    return self.clients.openWindow(safeUrl);
  }));
});
