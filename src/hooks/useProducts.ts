import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Category, Product } from '../types'

let globalMarkupPromise: Promise<number> | null = null

async function getGlobalMarkup() {
  if (globalMarkupPromise) return globalMarkupPromise

  globalMarkupPromise = (async () => {
    try {
      const { data } = await supabase.from('store_settings').select('markup_percentage').single()
      return data?.markup_percentage || 0
    } catch {
      return 0
    }
  })()

  // Clear cache after 60 seconds
  setTimeout(() => {
    globalMarkupPromise = null
  }, 60000)

  return globalMarkupPromise
}


function applyMarkup(product: any, globalMarkup: number): Product {
  let finalPrice = product.selling_price
  const storeMarkup = product.store?.markup_percentage
  const markup = storeMarkup !== undefined && storeMarkup !== null ? storeMarkup : globalMarkup

  if (markup > 0) {
    finalPrice = Math.ceil(finalPrice * (1 + markup / 100))
  }

  // legacy override
  if (product.store_id && product.marketplace_price != null) {
    finalPrice = product.marketplace_price
  }

  return { ...product, selling_price: finalPrice } as Product
}

export function useProducts(
  filters?: {
    categoryIds?: string[]
    search?: string
    featured?: boolean
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['products', filters],
    ...options,
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, store:stores(markup_percentage)')
        .eq('is_published', true)
        .or('store_id.is.null,is_approved_for_marketplace.eq.true')
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
      
      const globalMarkup = await getGlobalMarkup()
      
      const products = (data as any[] || []).map(product => applyMarkup(product, globalMarkup))
      
      return products as Product[]
    },
  })
}

export function useInfiniteProducts(
  filters?: {
    categoryIds?: string[]
    search?: string
    featured?: boolean
  },
  options?: { enabled?: boolean },
  pageSize = 10
) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', filters, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      let q = supabase
        .from('products')
        .select('*, store:stores(markup_percentage)')
        .eq('is_published', true)
        .or('store_id.is.null,is_approved_for_marketplace.eq.true')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + pageSize - 1)

      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        q = q.in('category_id', filters.categoryIds)
      }
      if (filters?.search) {
        q = q.ilike('title', `%${filters.search}%`)
      }
      if (filters?.featured) {
        q = q.eq('is_featured', true)
      }

      const { data, error } = await q
      if (error) throw error
      
      const globalMarkup = await getGlobalMarkup()
      const rawProducts = data as any[]
      const products = rawProducts.map(product => applyMarkup(product, globalMarkup))
      
      return {
        data: products,
        nextOffset: products.length === pageSize ? pageParam + pageSize : null,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    ...options,
  })
}


export function useProduct(id: string, isMarketplaceView = true) {
  return useQuery({
    queryKey: ['product', id, isMarketplaceView],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, store:stores(markup_percentage)')
        .eq('id', id)
        .eq('is_published', true)
        .single()
      if (error) throw error
      
      const globalMarkup = await getGlobalMarkup()
      const product = data as any
      if (isMarketplaceView) {
        return applyMarkup(product, globalMarkup)
      }
      return product as Product
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
      const { data, error } = await supabase
        .from('products')
        .select('*, store:stores(markup_percentage)')
        .eq('is_published', true)
        .or('store_id.is.null,is_approved_for_marketplace.eq.true')
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      
      const globalMarkup = await getGlobalMarkup()
      const rawProducts = data as any[]
      const products = rawProducts.map(product => applyMarkup(product, globalMarkup))
      
      return products
    },
  })
}

export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
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

export function useProductCategoryRefs() {
  return useQuery({
    queryKey: ['products', 'category-refs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category_id, category')
        .eq('is_published', true)
      if (error) throw error
      return data as { category_id: string | null; category: string | null }[]
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
