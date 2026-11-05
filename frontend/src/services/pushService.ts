import api from './api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/vapid-key')
    if (!res.ok) return null
    const data = await res.json() as { data: { publicKey: string } }
    return data.data.publicKey
  } catch {
    return null
  }
}

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushState(): Promise<'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'> {
  if (!(await isPushSupported())) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'subscribed' : 'unsubscribed'
}

export async function subscribeToPush(): Promise<boolean> {
  if (!(await isPushSupported())) return false
  const vapidKey = await getVapidPublicKey()
  if (!vapidKey) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
  })

  const json = sub.toJSON()
  await api.post('/push/subscribe', {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  })
  return true
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await api.delete('/push/subscribe', { data: { endpoint: sub.endpoint } })
  await sub.unsubscribe()
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  await navigator.serviceWorker.register('/sw.js')
}
