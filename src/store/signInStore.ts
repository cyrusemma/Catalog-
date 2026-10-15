import { create } from 'zustand'
import { sanitizeRedirectUrl, saveAuthRedirect } from '../lib/authRedirect'

interface SignInStore {
  open: boolean
  /** Optional context string ("Sign in to save favourites", etc.) shown on the modal. */
  reason: string | null
  /** Optional target path to return to after sign-in / sign-up. */
  redirectUrl: string | null
  openModal: (reason?: string, redirectUrl?: string) => void
  closeModal: () => void
}

/**
 * Shared store so any button or prompt across the app can open the sign-in modal
 * and automatically preserve the user's current page (path + search + hash) for return-to.
 */
export const useSignInStore = create<SignInStore>(set => ({
  open: false,
  reason: null,
  redirectUrl: null,
  openModal: (reason?: string, redirectUrl?: string) => {
    let target = redirectUrl

    if (!target && typeof window !== 'undefined') {
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
      // Don't capture auth callback or password reset as return targets
      if (!current.startsWith('/auth/callback') && !current.startsWith('/reset-password')) {
        target = current
      }
    }

    const sanitized = sanitizeRedirectUrl(target)
    if (sanitized) {
      saveAuthRedirect(sanitized)
    }

    set({
      open: true,
      reason: reason ?? null,
      redirectUrl: sanitized ?? null,
    })
  },
  closeModal: () => set({ open: false }),
}))
