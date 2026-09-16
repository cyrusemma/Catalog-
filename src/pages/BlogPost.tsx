import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Clock, 
  MessageCircle, 
  Twitter, 
  Copy, 
  Check, 
  Newspaper
} from 'lucide-react'
import { useState } from 'react'

import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useBlogPost, useBlogPosts } from '../hooks/useCms'
import { toast } from 'sonner'

function calculateReadingTime(html: string): number {
  if (!html) return 1
  const text = html.replace(/<[^>]*>/g, '')
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Our Marketplace'

  const { data: post, isLoading } = useBlogPost(slug || '')
  const { data: allPosts = [] } = useBlogPosts({ limit: 4, publishedOnly: true })
  const [copied, setCopied] = useState(false)

  useDocumentTitle(post ? `${post.title} | ${storeName}` : `Article | ${storeName}`)

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsAppShare = () => {
    if (!post) return
    const text = encodeURIComponent(`Read "${post.title}" on ${storeName}: ${shareUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleTwitterShare = () => {
    if (!post) return
    const text = encodeURIComponent(`Read "${post.title}" on ${storeName}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="pt-28 pb-20 px-4 max-w-3xl mx-auto text-center text-gray-400">
        Loading story...
      </div>
    )
  }

  if (!post) {
    return (
      <div className="pt-28 pb-20 px-4 max-w-3xl mx-auto text-center space-y-4">
        <Newspaper className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
        <h1 className="text-2xl font-bold text-dark-800 dark:text-white">Article Not Found</h1>
        <p className="text-xs text-gray-400">The article you are looking for has been moved or removed.</p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Journal
        </Link>
      </div>
    )
  }

  const readTime = calculateReadingTime(post.content_html)
  const relatedPosts = allPosts.filter(p => p.id !== post.id).slice(0, 3)

  return (
    <div className="pt-24 pb-24 px-4 sm:px-6 w-full min-h-screen">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-amber-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stories & Journal
        </Link>

        {/* Header Metadata */}
        <div className="space-y-4">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-dark-800 dark:text-white leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg text-dark-800/70 dark:text-white/70 leading-relaxed font-normal">
              {post.excerpt}
            </p>
          )}

          {/* Author & Reading Time Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-dark-800/10 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <p className="font-semibold text-dark-800 dark:text-white">
                  {post.author_name || 'Store Editorial'}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span>{post.published_at ? new Date(post.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {readTime} min read
                  </span>
                </div>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleWhatsAppShare}
                title="Share on WhatsApp"
                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              <button
                onClick={handleTwitterShare}
                title="Share on X (Twitter)"
                className="p-2 rounded-xl bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyLink}
                title="Copy Link"
                className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {post.cover_image_url && (
          <div className="rounded-3xl overflow-hidden border border-dark-800/10 dark:border-white/10 shadow-lg">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full max-h-[480px] object-cover"
            />
          </div>
        )}

        {/* Article Body Content */}
        <div 
          className="prose prose-brand dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed text-dark-800/80 dark:text-white/80 py-4"
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />

        {/* Article Footer Share CTA */}
        <div className="p-6 rounded-3xl bg-amber-50 dark:bg-dark-900 border border-amber-200/60 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-dark-800 dark:text-white">Enjoyed this read?</h3>
            <p className="text-xs text-dark-800/60 dark:text-white/60">Share this story with friends and family.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <MessageCircle className="w-4 h-4" /> Share on WhatsApp
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-800 text-dark-800 dark:text-white border border-gray-200 dark:border-white/10 text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <Copy className="w-4 h-4" /> Copy Link
            </button>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="pt-10 space-y-6">
            <h3 className="text-xl font-display font-bold text-dark-800 dark:text-white">
              More Stories You Might Like
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.slug}`}
                  className="group bg-white dark:bg-dark-900 rounded-2xl border border-dark-800/10 dark:border-white/10 overflow-hidden p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {rel.cover_image_url && (
                      <div className="h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-800 mb-3">
                        <img src={rel.cover_image_url} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    <h4 className="text-sm font-bold text-dark-800 dark:text-white group-hover:text-amber-500 transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                  </div>
                  <span className="text-[11px] text-gray-400 mt-3 block">
                    {calculateReadingTime(rel.content_html)} min read
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
