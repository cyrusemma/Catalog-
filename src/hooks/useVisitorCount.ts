import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/** Reads the all-time visitor count via the public SECURITY DEFINER RPC. */
export function useVisitorCount(enabled = true) {
  return useQuery({
    queryKey: ['visitor-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_visitor_count')
      if (error) return 0
      return Number(data) || 0
    },
    enabled,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  })
}
