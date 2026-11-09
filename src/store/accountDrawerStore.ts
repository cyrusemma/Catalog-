import { create } from 'zustand'

interface AccountDrawerState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useAccountDrawerStore = create<AccountDrawerState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
