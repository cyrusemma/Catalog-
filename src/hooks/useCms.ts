import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CustomPage, BlogPost, Category } from '../types'

// ==========================================
// CUSTOM PAGES HOOKS
// ==========================================

export function useCustomPages(options?: { publishedOnly?: boolean }) {
  return useQuery<CustomPage[]>({
    queryKey: ['custom-pages', options],
    queryFn: async () => {
      let q = supabase
        .from('custom_pages')
        .select('*')
        .order('title', { ascending: true })

      if (options?.publishedOnly) {
        q = q.eq('is_published', true)
      }

      const { data, error } = await q
      if (error) {
        // Fallback gracefully if table not yet migrated
        console.warn('custom_pages query error or table not migrated:', error.message)
        return []
      }
      return data || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useCustomPage(slug: string) {
  return useQuery<CustomPage | null>({
    queryKey: ['custom-page', slug],
    queryFn: async () => {
      if (!slug) return null
      const { data, error } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        console.warn(`custom_page for slug "${slug}" error:`, error.message)
        return null
      }
      return data || null
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!slug,
  })
}

export function useUpsertCustomPage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (page: Partial<CustomPage> & { slug: string; title: string }) => {
      const payload: any = {
        ...page,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('custom_pages')
        .upsert(payload, { onConflict: 'slug' })
        .select()
        .single()

      if (error) throw error
      return data as CustomPage
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-pages'] })
      queryClient.invalidateQueries({ queryKey: ['custom-page', data.slug] })
    },
  })
}

export function useDeleteCustomPage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_pages')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-pages'] })
    },
  })
}

// ==========================================
// BLOG POSTS HOOKS
// ==========================================

export function useBlogPosts(filters?: {
  tag?: string
  search?: string
  publishedOnly?: boolean
  limit?: number
}) {
  return useQuery<BlogPost[]>({
    queryKey: ['blog-posts', filters],
    queryFn: async () => {
      let q = supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })

      if (filters?.publishedOnly !== false) {
        q = q.eq('is_published', true)
      }
      if (filters?.tag) {
        q = q.contains('tags', [filters.tag])
      }
      if (filters?.search) {
        q = q.ilike('title', `%${filters.search}%`)
      }
      if (filters?.limit) {
        q = q.limit(filters.limit)
      }

      const { data, error } = await q
      if (error) {
        console.warn('blog_posts query error or table not migrated:', error.message)
        return []
      }
      return data || []
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useBlogPost(slugOrId: string) {
  return useQuery<BlogPost | null>({
    queryKey: ['blog-post', slugOrId],
    queryFn: async () => {
      if (!slugOrId) return null
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)
      
      let query = supabase.from('blog_posts').select('*')
      if (isUuid) {
        query = query.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`)
      } else {
        query = query.eq('slug', slugOrId)
      }

      const { data, error } = await query.maybeSingle()
      if (error) {
        console.warn('blog_post error:', error.message)
        return null
      }
      return data || null
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!slugOrId,
  })
}

export function useUpsertBlogPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (post: Partial<BlogPost> & { title: string; slug: string }) => {
      const payload: any = {
        ...post,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('blog_posts')
        .upsert(payload, { onConflict: 'slug' })
        .select()
        .single()

      if (error) throw error
      return data as BlogPost
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
      queryClient.invalidateQueries({ queryKey: ['blog-post', data.slug] })
      queryClient.invalidateQueries({ queryKey: ['blog-post', data.id] })
    },
  })
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
    },
  })
}

// ==========================================
// CATEGORY CMS HOOKS
// ==========================================

export function useCategoriesAdmin() {
  return useQuery<Category[]>({
    queryKey: ['categories', 'admin-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data || []
    },
    staleTime: 1000 * 30,
  })
}

export function useUpsertCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (category: Partial<Category> & { name: string; slug: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .upsert(category)
        .select()
        .single()

      if (error) throw error
      return data as Category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
