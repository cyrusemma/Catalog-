import { useQuery } from '@tanstack/react-query'
import { Star, MessageSquareQuote } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { motion } from 'framer-motion'

export default function CustomerReviews() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['customer-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      // Filter for 4 and 5 star reviews only (or 'good'/'amazing' if text)
      return (data || []).filter(r => {
        if (typeof r.rating === 'number') return r.rating >= 4
        if (typeof r.rating === 'string') return ['good', 'amazing', '4', '5'].includes(r.rating.toLowerCase())
        return true
      }).slice(0, 8)
    }
  })

  if (isLoading || !reviews || reviews.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-cream-50/50 dark:bg-dark-900/50 border-t border-cream-200 dark:border-white/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-center gap-2 mb-4 text-brand-400">
            <MessageSquareQuote size={24} />
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-dark-800 dark:text-white mb-4">
            What Our Customers Say
          </h2>
          <p className="text-dark-800/60 dark:text-white/60 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what people love about shopping with us.
          </p>
        </motion.div>
      </div>

      <div className="flex overflow-x-auto pb-8 hide-scrollbar snap-x snap-mandatory px-4 sm:px-6 lg:px-8 gap-6 max-w-7xl mx-auto">
        {reviews.map((review, idx) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="snap-center shrink-0 w-[300px] sm:w-[350px] glass p-6 rounded-2xl border border-cream-200 dark:border-white/10 flex flex-col"
          >
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => {
                const ratingNum = typeof review.rating === 'number' ? review.rating : (review.rating === 'amazing' ? 5 : 4)
                return (
                  <Star
                    key={i}
                    size={16}
                    className={i < ratingNum ? 'text-brand-400 fill-brand-400' : 'text-gray-300'}
                  />
                )
              })}
            </div>
            <p className="text-dark-800/80 dark:text-white/80 italic flex-1 mb-6">
              "{review.message || review.comment}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-500 font-bold">
                {(review.name || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-dark-800 dark:text-white font-bold text-sm">
                  {review.name || 'Anonymous Customer'}
                </p>
                <p className="text-dark-800/40 dark:text-white/40 text-xs">Verified Buyer</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
