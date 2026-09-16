import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Newspaper, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar, 
  User, 
  ExternalLink 
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { useBlogPosts, useDeleteBlogPost, useUpsertBlogPost } from '../../hooks/useCms'
import { toast } from 'sonner'
import type { BlogPost } from '../../types'

export default function AdminBlog() {
  const [search, setSearch] = useState('')

  const { data: posts = [], isLoading } = useBlogPosts({ publishedOnly: false })
  const deleteMutation = useDeleteBlogPost()
  const upsertMutation = useUpsertBlogPost()

  const filteredPosts = posts.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (p.author_name && p.author_name.toLowerCase().includes(q))
    )
  })

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      await upsertMutation.mutateAsync({
        ...post,
        is_published: !post.is_published,
      })
      toast.success(post.is_published ? 'Post unpublished (Draft)' : 'Post published!')
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message)
    }
  }

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Are you sure you want to delete article "${post.title}"?`)) return
    try {
      await deleteMutation.mutateAsync(post.id)
      toast.success('Article deleted')
    } catch (err: any) {
      toast.error('Failed to delete article: ' + err.message)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Newspaper className="w-7 h-7 text-amber-500" />
              Blog & Article Studio
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Publish news, product style guides, buying tips, and brand updates for your store audience.
            </p>
          </div>
          <Link
            to="/admin/blog/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Write New Post
          </Link>
        </div>

        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-dark-900 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts by title, tag, or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{posts.filter(p => p.is_published).length} Published</span>
            <span>•</span>
            <span>{posts.filter(p => !p.is_published).length} Drafts</span>
          </div>
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading articles...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-white/5 p-8">
            <Newspaper className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">No blog posts found</p>
            <p className="text-xs text-gray-400 mt-1">Start your content marketing journey by creating your first article.</p>
            <Link
              to="/admin/blog/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Write Article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Cover Image & Status Badge */}
                  <div className="relative h-44 bg-gray-100 dark:bg-dark-800 overflow-hidden">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                        <Newspaper className="w-10 h-10 opacity-40" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm ${
                          post.is_published
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500/90 text-white'
                        }`}
                      >
                        {post.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  {/* Post Details */}
                  <div className="p-5">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 mb-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.author_name || 'Store Team'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Unpublished'}
                      </span>
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePublish(post)}
                      title={post.is_published ? 'Unpublish' : 'Publish'}
                      className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                        post.is_published
                          ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                      }`}
                    >
                      {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span className="text-[11px]">{post.is_published ? 'Draft' : 'Publish'}</span>
                    </button>
                    {post.is_published && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg"
                        title="View Live"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/admin/blog/${post.id}/edit`}
                      className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                      title="Edit Article"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(post)}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
