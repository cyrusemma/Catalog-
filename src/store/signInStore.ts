import { create } from 'zustand'

interface SignInStore {
  open: boolean
  /** Optional context string ("Sign in to save favourites", etc.) shown on the modal. */
  reason: string | null
  openModal: (reason?: string) => void
  closeModal: () => void
}

/**
 * Tiny shared store so the Navbar button, the sign-in prompt toast, the
 * wishlist heart, and anywhere else that needs to ask a guest to sign in can
 * all open the same modal without prop-drilling. The modal itself is mounted
 * once in StorefrontLayout and reads from here.
 */
export const useSignInStore = create<SignInStore>(set => ({
  open: false,
  reason: null,
  openModal: (reason?: string) => set({ open: true, reason: reason ?? null }),
  closeModal: () => set({ open: false }),
}))
