self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('🎉 ChikiGlam — Nueva reserva', {
      body: 'Entrá al panel para ver los detalles.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'nueva-reserva',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const adminUrl = '/admin/orders'
      for (const client of list) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.navigate(adminUrl)
          return client.focus()
        }
      }
      return clients.openWindow(adminUrl)
    })
  )
})
