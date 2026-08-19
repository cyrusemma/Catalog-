import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Eye, EyeSlash, Trash, MagnifyingGlass, Funnel } from '@phosphor-icons/react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { ProductReview, SiteReview } from '../../types'
import { toast } from 'sonner'

import { useAdminContext } from '../../hooks/useAdminContext'

type StatusFilter = 'all' | 'pending' | 'published' | 'hidden'

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          weight={i < rating ? 'fill' : 'regular'}
          className={i < rating ? 'text-brand-400' : 'text-gray-200'}
        />
      ))}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-600 border-amber-200',
  published: 'bg-green-50 text-green-600 border-green-200',
  hidden:    'bg-gray-100 text-gray-500 border-gray-200',
}

export default function AdminReviews() {
  const qc = useQueryClient()
  const [activeSubTab, setActiveSubTab] = useState<'product' | 'site'>('product')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [expandedSiteReviewId, setExpandedSiteReviewId] = useState<string | null>(null)
  const { data: context } = useAdminContext()

  const { data: reviews, isLoading } = useQuery<(ProductReview & { products?: { title: string } })[]>({
    queryKey: ['admin-product-reviews', statusFilter, context?.storeId, context?.isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('product_reviews')
        .select('*, products(title)')
        .order('created_at', { ascending: false })
      
      if (context && !context.isAdmin && context.storeId) {
        query = query.eq('store_id', context.storeId)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      const { data, error } = await query
      if (error) throw error
      return (data || []) as any
    },
    enabled: !!context && activeSubTab === 'product',
  })

  const { data: siteReviews, isLoading: isLoadingSiteReviews } = useQuery<SiteReview[]>({
    queryKey: ['admin-site-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_reviews')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as any
    },
    enabled: !!context && !!context.isAdmin && activeSubTab === 'site',
  })

  const deleteSiteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('site_reviews').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-site-reviews'] })
      toast.success("Site feedback deleted successfully.")
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'published' | 'hidden' }) => {
      const { error } = await supabase
        .from('product_reviews')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-product-reviews'] })
    },
  })

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_reviews').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-product-reviews'] })
    },
  })

  const filtered = reviews?.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (r.reviewer_name?.toLowerCase().includes(q)) ||
      (r.comment?.toLowerCase().includes(q)) ||
      ((r as any).products?.title?.toLowerCase().includes(q))
    )
  })

  const filteredSiteReviews = siteReviews?.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (r.name?.toLowerCase().includes(q)) ||
      (r.email?.toLowerCase().includes(q)) ||
      (r.message?.toLowerCase().includes(q))
    )
  })

  const pendingCount = reviews?.filter(r => r.status === 'pending').length ?? 0

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 max-w-5xl">
        <div className="mb-8">
          <p className="text-gray-400 text-sm mb-1">Moderation</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeSubTab === 'product' ? 'Product Reviews' : 'Site Feedback & Surveys'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {activeSubTab === 'product' 
              ? 'Approve, hide, or delete customer reviews per product.' 
              : 'Review detailed user experience scores and comments submitted by visitors.'}
            {activeSubTab === 'product' && pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-xs font-semibold">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>

        {/* Tab Selector */}
        {context?.isAdmin && (
          <div className="flex border-b border-gray-100 mb-6 gap-6">
            <button
              type="button"
              onClick={() => setActiveSubTab('product')}
              className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
                activeSubTab === 'product'
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Product Reviews
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('site')}
              className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
                activeSubTab === 'site'
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Site Feedback
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={activeSubTab === 'product' ? 'Search reviews...' : 'Search feedback by name, email, comment...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/15"
            />
          </div>
          {/* Status filter (only for product reviews) */}
          {activeSubTab === 'product' && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 flex-shrink-0">
              {(['all', 'pending', 'published', 'hidden'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    statusFilter === s
                      ? 'bg-white text-brand-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Reviews list */}
        {activeSubTab === 'product' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="p-6 text-sm text-gray-500">Loading reviews...</div>
            ) : !filtered || filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400">
                <Funnel size={32} className="mx-auto mb-3 text-gray-200" />
                {search ? 'No reviews match your search.' : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}reviews yet.`}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(review => (
                  <div key={review.id} className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        {/* Product name */}
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-400 mb-1">
                          {(review as any).products?.title || 'Unknown product'}
                        </p>
                        {/* Reviewer info + rating */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <StarDisplay rating={review.rating} />
                          <span className="text-sm font-semibold text-gray-900">
                            {review.reviewer_name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(review.created_at).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[review.status]}`}>
                            {review.status}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {review.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() => updateStatus.mutate({ id: review.id, status: 'published' })}
                            title="Publish"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition-colors"
                          >
                            <Eye size={13} /> Publish
                          </button>
                        )}
                        {review.status !== 'hidden' && (
                          <button
                            type="button"
                            onClick={() => updateStatus.mutate({ id: review.id, status: 'hidden' })}
                            title="Hide"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200 transition-colors"
                          >
                            <EyeSlash size={13} /> Hide
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this review permanently?')) {
                              deleteReview.mutate(review.id)
                            }
                          }}
                          title="Delete"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Site Feedback List */}
        {activeSubTab === 'site' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fadeIn">
            {isLoadingSiteReviews ? (
              <div className="p-6 text-sm text-gray-500">Loading site feedback...</div>
            ) : !filteredSiteReviews || filteredSiteReviews.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400">
                <Funnel size={32} className="mx-auto mb-3 text-gray-200" />
                {search ? 'No feedback matches your search.' : 'No site feedback submissions yet.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredSiteReviews.map(review => {
                  const isExpanded = expandedSiteReviewId === review.id
                  const hasSurvey = review.survey_responses && Object.keys(review.survey_responses).length > 0
                  
                  // Compute average rating for survey questions if completed
                  let surveyAvg = 0
                  if (hasSurvey && review.survey_responses) {
                    const vals = Object.values(review.survey_responses).map(Number)
                    surveyAvg = vals.reduce((a, b) => a + b, 0) / vals.length
                  }

                  return (
                    <div key={review.id} className="p-5 hover:bg-gray-50/20 transition-all">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => hasSurvey && setExpandedSiteReviewId(isExpanded ? null : review.id)}
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <StarDisplay rating={review.rating} />
                            <span className="text-sm font-semibold text-gray-900">
                              {review.name || 'Anonymous'}
                            </span>
                            {review.email && (
                              <span className="text-xs text-gray-400 font-mono">
                                ({review.email})
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(review.created_at).toLocaleDateString(undefined, {
                                year: 'numeric', month: 'short', day: 'numeric',
                              })}
                            </span>
                            {hasSurvey && (
                              <span className="inline-flex items-center gap-1 bg-brand-400/10 text-brand-500 dark:text-brand-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-brand-400/20">
                                Survey Completed ({surveyAvg.toFixed(1)} Avg)
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-700 leading-relaxed font-medium">
                            "{review.message}"
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasSurvey && (
                            <button
                              type="button"
                              onClick={() => setExpandedSiteReviewId(isExpanded ? null : review.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-white/60 transition-colors"
                            >
                              {isExpanded ? 'Hide Survey' : 'View Survey'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Delete this feedback entry permanently?')) {
                                deleteSiteReview.mutate(review.id)
                              }
                            }}
                            title="Delete Feedback"
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Survey Breakdown Panel */}
                      {isExpanded && hasSurvey && review.survey_responses && (
                        <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-3 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                          {Object.entries(review.survey_responses).map(([key, val]) => {
                            const valNum = Number(val)
                            const label = key === 'navigation' ? '🔍 Navigation & Browsing' :
                                          key === 'design' ? '🎨 Visual Layout' :
                                          key === 'speed' ? '⚡ Speed & Load' : key
                            return (
                              <div key={key} className="space-y-1 bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{label}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <StarDisplay rating={valNum} />
                                  <span className="text-xs font-bold text-gray-800">{valNum}/5</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}