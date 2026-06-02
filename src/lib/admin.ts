import type { Session, User } from '@supabase/supabase-js'

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  // Only trust app_metadata.role — user_metadata is editable by the user
  // themselves (via supabase.auth.updateUser), so trusting it would let any
  // logged-in user grant themselves admin.
  const role = user.app_metadata?.role
  return role === 'admin'
}

export function isAdminSession(session: Session | null): boolean {
  return isAdminUser(session?.user)
}
