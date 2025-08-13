import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch (e) {
    console.error('SW registration failed:', e)
    return null
  }
}

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const getExistingSubscription = async (): Promise<PushSubscription | null> => {
  try {
    const reg = await navigator.serviceWorker.ready
    return await reg.pushManager.getSubscription()
  } catch (e) {
    console.warn('getExistingSubscription error:', e)
    return null
  }
}

export interface PushPreferenceFlags {
  global: boolean
  breakfast: boolean
  lunch: boolean
  snacks: boolean
  dinner: boolean
}

export const subscribeUserToPush = async (userId?: string, prefs?: PushPreferenceFlags): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID public key is not configured (VITE_VAPID_PUBLIC_KEY)')
  }
  try {
    const registration = await registerServiceWorker()
    if (!registration) return null

    // If already subscribed, return existing
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      if (userId) await saveSubscription(userId, existing, prefs)
      return existing
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY) : undefined
    })

    if (userId) await saveSubscription(userId, subscription, prefs)

    return subscription
  } catch (e) {
    console.error('Failed to subscribe to push:', e)
    return null
  }
}

export const unsubscribeUserFromPush = async (): Promise<boolean> => {
  try {
    const sub = await getExistingSubscription()
    if (sub) {
      await sub.unsubscribe()
    }
    return true
  } catch (e) {
    console.error('Failed to unsubscribe from push:', e)
    return false
  }
}

export const saveSubscription = async (userId: string, subscription: PushSubscription, prefs?: PushPreferenceFlags): Promise<boolean> => {
  try {
    const subObj = subscription.toJSON()
    const payload: Record<string, unknown> = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subObj.keys?.p256dh || null,
      auth: subObj.keys?.auth || null
    }

    // Attach preference flags if provided (for multi-user filtering on server-side)
    if (prefs) {
      // Prefer explicit columns if present in DB; otherwise, this may error and safely warn below.
      payload.pref_global = prefs.global
      payload.pref_breakfast = prefs.breakfast
      payload.pref_lunch = prefs.lunch
      payload.pref_snacks = prefs.snacks
      payload.pref_dinner = prefs.dinner
    }

    const { error } = await supabase.from('push_subscriptions').upsert(payload, {
      onConflict: 'endpoint'
    })

    if (error) {
      // If table missing or columns missing, just log and continue (client still functions locally)
      console.warn('Could not save push subscription (table/columns may be missing):', error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn('Error saving subscription:', e)
    return false
  }
}
