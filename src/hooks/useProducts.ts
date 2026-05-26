import { useQuery } from '@tanstack/react-query'
import type { Category, Product } from '../types'

export function useProducts(filters?: {
  categoryIds?: string[]
  search?: string
  featured?: boolean
}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const { supabase } = await import('../lib/supabase')
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        query = query.in('category_id', filters.categoryIds)
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }
      if (filters?.featured) {
        query = query.eq('is_featured', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Product[]
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { supabase } = await import('../lib/supabase')
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single()
      if (error) throw error
      return data as Product
    },
    enabled: !!id,
  })
}

export function useNewProducts(days = 7) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return useQuery({
    queryKey: ['products', 'new', days],
    queryFn: async () => {
      const { supabase } = await import('../lib/supabase')
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_published', true)
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return data as Product[]
    },
  })
}

export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const { supabase } = await import('../lib/supabase')
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, parent_id, sort_order')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Category[]
    },
    staleTime: 1000 * 60,
  })
}

/** Given a category id, return its id plus the ids of all direct children. */
export function expandCategoryIds(tree: Category[] | undefined, rootId: string): string[] {
  if (!tree) return [rootId]
  const ids = [rootId]
  for (const c of tree) {
    if (c.parent_id === rootId) ids.push(c.id)
  }
  return ids
}

/** Convenience accessors */
export function topLevelCategories(tree: Category[] | undefined): Category[] {
  return (tree ?? []).filter(c => c.parent_id === null).sort((a, b) => a.sort_order - b.sort_order)
}

export function childCategories(tree: Category[] | undefined, parentId: string): Category[] {
  return (tree ?? []).filter(c => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)
}

export function findCategory(tree: Category[] | undefined, id: string | null | undefined): Category | undefined {
  if (!id || !tree) return undefined
  return tree.find(c => c.id === id)
}
