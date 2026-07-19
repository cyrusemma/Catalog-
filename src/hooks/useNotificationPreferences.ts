import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  getActiveSubscription,
  pushIsSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushSubscription'
import { useCustomerSession } from './useCustomerSession'

export interface NotificationPreferences {
  pushSubscribed: boolean | null
  pushWorking: boolean
  pushError: string | null
  supported: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  toggle: () => Promise<void>
}

const BLOCKED_MESSAGE =
  'Notifications were blocked. Enable them in your browser settings to receive alerts.'

/**
 * Single home for the "is this device subscribed to web push?" state and the
 * actions that flip it. Used by the navbar bell, /settings, and /account so the
 * three views can't drift.
 */
export function useNotificationPreferences(): NotificationPreferences {
  const { isLoggedIn, user } = useCustomerSession()
  const qc = useQueryClient()
  const supported = pushIsSupported()

  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null)
  const [pushWorking, setPushWorking] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!isLoggedIn || !supported) {
      setPushSubscribed(null)
      return
    }
    getActiveSubscription().then(sub => {
      if (active) setPushSubscribed(!!sub)
    })
    return () => {
      active = false
    }
  }, [isLoggedIn, supported])

  const subscribe = async () => {
    if (!user) return
    setPushError(null)
    setPushWorking(true)
    try {
      const sub = await subscribeToPush(user.id)
      if (!sub) {
        setPushError(BLOCKED_MESSAGE)
        setPushSubscribed(false)
        return
      }
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ notify_new_arrivals: true })
        .eq('id', user.id)
      if (profileErr) {
        console.warn('Could not sync notify_new_arrivals flag:', profileErr.message)
      }
      qc.invalidateQueries({ queryKey: ['customer-profile'] })
      setPushSubscribed(true)
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Could not update notifications.')
    } finally {
      setPushWorking(false)
    }
  }

  const unsubscribe = async () => {
    if (!user) return
    setPushError(null)
    setPushWorking(true)
    try {
      await unsubscribeFromPush(user.id)
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ notify_new_arrivals: false })
        .eq('id', user.id)
      if (profileErr) {
        console.warn('Could not sync notify_new_arrivals flag:', profileErr.message)
      }
      qc.invalidateQueries({ queryKey: ['customer-profile'] })
      setPushSubscribed(false)
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Could not update notifications.')
    } finally {
      setPushWorking(false)
    }
  }

  const toggle = async () => {
    if (pushSubscribed) await unsubscribe()
    else await subscribe()
  }

  return { pushSubscribed, pushWorking, pushError, supported, subscribe, unsubscribe, toggle }
}
