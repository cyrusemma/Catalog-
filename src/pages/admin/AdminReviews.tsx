import { useQuery } from '@tanstack/react-query'
import { Star, MessageSquareQuote, Mail, PhoneCall, Instagram, ExternalLink } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { SiteReview } from '../../types'

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={14}
          className={index < rating ? 'text-brand-400 fill-brand-400 drop-shadow-[0_0_5px_rgba(212,130,10,0.55)]' : 'text-gray-300'}
        />
      ))}
    </div>
  )
}

export default function AdminReviews() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('site_reviews')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          const msg = (error.message || '').toLowerCase()
          // If table is missing on remote DB, fall back to local mock data
          if (msg.includes('relation "site_reviews" does not exist') || msg.includes("could not find the table 'public.site_reviews'")) {
            const local = JSON.parse(window.localStorage.getItem('mock_site_reviews') || '[]') as SiteReview[]
            return local
          }
          throw error
        }

        return (data || []) as SiteReview[]
      } catch (e) {
        // If anything else goes wrong, try local fallback
        try {
          const local = JSON.parse(window.localStorage.getItem('mock_site_reviews') || '[]') as SiteReview[]
          return local
        } catch (err) {
          return []
        }
      }
    },
  })

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl">
        <div className="mb-8">
          <p className="text-gray-400 text-sm mb-1">Feedback</p>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-2">Read site ratings and suggestions submitted by visitors.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareQuote size={16} className="text-brand-400" />
              <h2 className="font-semibold text-gray-900">Submitted reviews</h2>
            </div>
            <span className="text-xs text-gray-400">{reviews?.length || 0} entries</span>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading reviews...</div>
          ) : reviews && reviews.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {reviews.map(review => (
                <div key={review.id} className="p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <RatingStars rating={review.rating} />
                      <span className="text-sm font-semibold text-gray-900">
                        {review.name?.trim() || 'Anonymous visitor'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{review.message}</p>
                    {review.page_url && (
                      <a
                        href={review.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-brand-400 hover:text-brand-500"
                      >
                        <ExternalLink size={12} />
                        Open page source
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs lg:justify-end">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                      <Mail size={12} />
                      cyrusadetu@gmail.com
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                      <PhoneCall size={12} />
                      0599399983
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                      <Instagram size={12} />
                      @cyrus._.emma
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">No reviews submitted yet.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}