import type { Session, User } from '@supabase/supabase-js'

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  const role = user.app_metadata?.role
  return role === 'admin'
}

export function isAdminSession(session: Session | null): boolean {
  return isAdminUser(session?.user)
}
