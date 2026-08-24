/**
 * usePriceRanges Hook
 * 
 * Provides queries and mutations for managing and consuming
 * admin-configurable price ranges.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PriceRange } from '../types'

export const DEFAULT_PRICE_RANGES: PriceRange[] = [
  { id: 'default-1', name: 'Budget', min_price: 0, max_price: 50, label: 'Under GH₵50', sort_order: 1, is_active: true },
  { id: 'default-2', name: 'Mid Range', min_price: 50, max_price: 100, label: 'GH₵50 – GH₵100', sort_order: 2, is_active: true },
  { id: 'default-3', name: 'Standard', min_price: 100, max_price: 250, label: 'GH₵100 – GH₵250', sort_order: 3, is_active: true },
  { id: 'default-4', name: 'Upper', min_price: 250, max_price: 500, label: 'GH₵250 – GH₵500', sort_order: 4, is_active: true },
  { id: 'default-5', name: 'Premium', min_price: 500, max_price: null, label: 'GH₵500+', sort_order: 5, is_active: true },
]

export function usePriceRanges(options: { onlyActive?: boolean } = {}) {
  const { onlyActive = true } = options

  return useQuery<PriceRange[]>({
    queryKey: ['price-ranges', { onlyActive }],
    queryFn: async () => {
      try {
        let query = supabase
          .from('price_ranges')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('min_price', { ascending: true })

        if (onlyActive) {
          query = query.eq('is_active', true)
        }

        const { data, error } = await query

        if (error) {
          // If table doesn't exist yet, return default ranges for customer facing view
          console.warn('Could not fetch price_ranges, using defaults:', error.message)
          return onlyActive ? DEFAULT_PRICE_RANGES.filter(r => r.is_active) : DEFAULT_PRICE_RANGES
        }

        if (!data || data.length === 0) {
          return onlyActive ? DEFAULT_PRICE_RANGES.filter(r => r.is_active) : []
        }

        return data as PriceRange[]
      } catch (err) {
        console.warn('Error fetching price ranges:', err)
        return onlyActive ? DEFAULT_PRICE_RANGES.filter(r => r.is_active) : DEFAULT_PRICE_RANGES
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

export function useCreatePriceRange() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (newRange: Omit<PriceRange, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('price_ranges')
        .insert({
          ...newRange,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data as PriceRange
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-ranges'] })
    },
  })
}

export function useUpdatePriceRange() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PriceRange> & { id: string }) => {
      const { data, error } = await supabase
        .from('price_ranges')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PriceRange
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-ranges'] })
    },
  })
}

export function useDeletePriceRange() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('price_ranges')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-ranges'] })
    },
  })
}

export function useTogglePriceRangeActive() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('price_ranges')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-ranges'] })
    },
  })
}

export function useReorderPriceRanges() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index + 1,
        updated_at: new Date().toISOString(),
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('price_ranges')
          .update({ sort_order: update.sort_order, updated_at: update.updated_at })
          .eq('id', update.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-ranges'] })
    },
  })
}
