import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Newspaper, 
  Search, 
  Clock, 
  ArrowRight, 
  Sparkles 
} from 'lucide-react'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useBlogPosts } from '../hooks/useCms'
import SEOHead from '../components/layout/SEOHead'
import Breadcrumbs from '../components/ui/Breadcrumbs'


function calculateReadingTime(html: string): number {
  if (!html) return 1
  const text = html.replace(/<[^>]*>/g, '')
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export default function Blog() {
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Our Marketplace'

  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const { data: posts = [], isLoading } = useBlogPosts({ publishedOnly: true })

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>()
    posts.forEach(p => {
      p.tags?.forEach(t => set.add(t))
    })
    return Array.from(set)
  }, [posts])

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const matchesSearch = !search.trim() || 
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(search.toLowerCase()))
      const matchesTag = !selectedTag || (p.tags && p.tags.includes(selectedTag))
      return matchesSearch && matchesTag
    })
  }, [posts, search, selectedTag])

  const featuredPost = posts[0]
  const listPosts = selectedTag || search.trim() ? filteredPosts : filteredPosts.slice(1)

  const blogCollectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${storeName} Journal & Stories`,
    description: 'Style inspirations, product guides, and behind-the-scenes stories from our marketplace creators.',
    url: typeof window !== 'undefined' ? `${window.location.origin}/blog` : 'https://catalog.cyrus.com/blog',
  }

  return (
    <div className="pt-24 pb-24 px-4 sm:px-6 w-full min-h-screen">
      <SEOHead
        title={`Stories & Blog | ${storeName}`}
        description="Style inspirations, product guides, and behind-the-scenes stories from our marketplace creators."
        schemaData={blogCollectionSchema}
      />

      <div className="max-w-6xl mx-auto space-y-10">
        <Breadcrumbs items={[{ label: 'Stories & Blog' }]} />

        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Stories & Curations
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white">
            The {storeName} Journal
          </h1>

          <p className="text-sm sm:text-base text-dark-800/60 dark:text-white/60">
            Style inspirations, product guides, and behind-the-scenes stories from our marketplace creators.
          </p>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-900 border border-dark-800/10 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
            />
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTag === null
                    ? 'bg-dark-900 dark:bg-white text-white dark:text-dark-900 shadow-sm'
                    : 'bg-white dark:bg-dark-900 text-gray-600 dark:text-gray-300 border border-dark-800/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                All Stories
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedTag === tag
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white dark:bg-dark-900 text-gray-600 dark:text-gray-300 border border-dark-800/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Loading journal...</div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-dark-900 rounded-3xl border border-dark-800/10 dark:border-white/10 p-8">
            <Newspaper className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-base font-bold text-dark-800 dark:text-white">No articles published yet</p>
            <p className="text-xs text-gray-400 mt-1">Check back soon for new journal releases!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured Post Hero (shown when no search/tag is active) */}
            {!selectedTag && !search.trim() && featuredPost && (
              <Link
                to={`/blog/${featuredPost.slug}`}
                className="group block bg-white dark:bg-dark-900 rounded-3xl border border-dark-800/10 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative h-64 lg:h-96 overflow-hidden bg-gray-100 dark:bg-dark-800">
                    {featuredPost.cover_image_url ? (
                      <img
                        src={featuredPost.cover_image_url}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Newspaper className="w-16 h-16 opacity-30" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-md uppercase tracking-wider">
                        Featured Story
                      </span>
                    </div>
                  </div>

                  <div className="p-6 lg:p-10 flex flex-col justify-between">
                    <div className="space-y-4">
                      {featuredPost.tags && featuredPost.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {featuredPost.tags.map(t => (
                            <span key={t} className="text-xs font-semibold text-amber-500">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <h2 className="text-2xl sm:text-3xl font-display font-bold text-dark-800 dark:text-white group-hover:text-amber-500 transition-colors">
                        {featuredPost.title}
                      </h2>
                      {featuredPost.excerpt && (
                        <p className="text-sm text-dark-800/70 dark:text-white/60 leading-relaxed line-clamp-3">
                          {featuredPost.excerpt}
                        </p>
                      )}
                    </div>

                    <div className="pt-6 mt-6 border-t border-dark-800/10 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-dark-800 dark:text-white">
                          {featuredPost.author_name || 'Store Team'}
                        </span>
                        <span>•</span>
                        <span>{featuredPost.published_at ? new Date(featuredPost.published_at).toLocaleDateString() : ''}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {calculateReadingTime(featuredPost.content_html)} min read
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-amber-500 font-semibold group-hover:translate-x-1 transition-transform">
                        Read Story <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid of Articles */}
            {listPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listPosts.map((post) => {
                  const readTime = calculateReadingTime(post.content_html)
                  return (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="group bg-white dark:bg-dark-900 rounded-3xl border border-dark-800/10 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Cover Image */}
                        <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-dark-800">
                          {post.cover_image_url ? (
                            <img
                              src={post.cover_image_url}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Newspaper className="w-10 h-10 opacity-30" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="p-5 space-y-2.5">
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {post.tags.slice(0, 2).map(t => (
                                <span key={t} className="text-[11px] font-semibold text-amber-500">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}

                          <h3 className="text-lg font-bold text-dark-800 dark:text-white group-hover:text-amber-500 transition-colors line-clamp-2">
                            {post.title}
                          </h3>

                          {post.excerpt && (
                            <p className="text-xs text-dark-800/60 dark:text-white/60 line-clamp-2 leading-relaxed">
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="p-5 pt-3 border-t border-dark-800/5 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <span className="truncate max-w-[120px]">
                          {post.author_name || 'Store Team'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>{readTime} min read</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
