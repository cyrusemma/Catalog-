import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  X, 
  Image as ImageIcon, 
  AlertCircle 
} from 'lucide-react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { useBlogPost, useUpsertBlogPost } from '../../hooks/useCms'
import { compressImage } from '../../lib/imageOptimization'
import { toast } from 'sonner'
import type { BlogPost } from '../../types'

export default function AdminBlogForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id && id !== 'new'
  const navigate = useNavigate()

  const { data: existingPost, isLoading } = useBlogPost(id || '')
  const upsertMutation = useUpsertBlogPost()


  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [authorName, setAuthorName] = useState('Store Team')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isPublished, setIsPublished] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [formError, setFormError] = useState('')

  // Sync state if editing
  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title || '')
      setSlug(existingPost.slug || '')
      setExcerpt(existingPost.excerpt || '')
      setContentHtml(existingPost.content_html || '')
      setCoverImageUrl(existingPost.cover_image_url || '')
      setAuthorName(existingPost.author_name || 'Store Team')
      setTags(existingPost.tags || [])
      setIsPublished(existingPost.is_published !== false)
    }
  }, [existingPost])

  // Handle Title -> Slug
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!isEditing) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
    }
  }

  // Tag management
  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '')
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  // Cover image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const compressed = await compressImage(file, { maxWidthOrHeight: 1600, maxSizeMB: 1 })
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `blog/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, compressed, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath)
      setCoverImageUrl(publicUrlData.publicUrl)
      toast.success('Cover image uploaded!')
    } catch (err: any) {
      toast.error('Failed to upload image: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setFormError('Article title is required')
      return
    }
    if (!slug.trim()) {
      setFormError('Article slug is required')
      return
    }

    try {
      setFormError('')
      const payload: Partial<BlogPost> & { title: string; slug: string } = {
        ...(existingPost?.id ? { id: existingPost.id } : {}),
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        content_html: contentHtml,
        cover_image_url: coverImageUrl.trim() || null,
        author_name: authorName.trim() || 'Store Team',
        tags,
        is_published: isPublished,
        published_at: isPublished
          ? existingPost?.published_at || new Date().toISOString()
          : null,
      }

      await upsertMutation.mutateAsync(payload)
      toast.success(isEditing ? 'Article updated!' : 'Article published!')
      navigate('/admin/blog')
    } catch (err: any) {
      setFormError(err.message || 'Failed to save article')
      toast.error('Error saving article: ' + err.message)
    }
  }

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean'],
    ],
  }

  if (isEditing && isLoading) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-gray-400">Loading article editor...</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/admin/blog"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-amber-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Articles
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/blog')}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {upsertMutation.isPending ? 'Saving...' : isEditing ? 'Update Article' : 'Publish Article'}
            </button>
          </div>
        </div>

        {formError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}

        {/* Main Editor Card */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
              Article Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5 Must-Have Essentials For Your Daily Routine"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-base font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Slug & Author Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                URL Slug *
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-gray-100 dark:bg-dark-800/80 border border-r-0 border-gray-200 dark:border-white/10 rounded-l-xl text-xs text-gray-500">
                  /blog/
                </span>
                <input
                  type="text"
                  required
                  placeholder="article-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-r-xl text-sm font-mono text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                Author Name
              </label>
              <input
                type="text"
                placeholder="Store Team"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Short Excerpt */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
              Short Summary / Excerpt
            </label>
            <textarea
              rows={2}
              placeholder="A brief 1-2 sentence hook for search previews and blog index cards..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
              Cover Image
            </label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {coverImageUrl ? (
                <div className="relative w-full sm:w-48 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                  <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-full sm:w-48 h-32 rounded-xl bg-gray-100 dark:bg-dark-800 border border-dashed border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}

              <div className="flex-1 w-full space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Upload Cover Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                <input
                  type="url"
                  placeholder="Or paste external image URL"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
              Tags / Topics
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. style, guide, tips"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                className="flex-1 px-3.5 py-2 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-xs font-semibold rounded-xl"
              >
                Add Tag
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rich Content Editor */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
              Article Content *
            </label>
            <div className="quill-dark-wrapper border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-dark-800 min-h-[400px]">
              <ReactQuill
                theme="snow"
                value={contentHtml}
                onChange={setContentHtml}
                modules={modules}
                placeholder="Write your article stories, formatting, and images here..."
                className="h-[340px]"
              />
            </div>
          </div>

          {/* Publication Status Card */}
          <div className="p-4 bg-gray-50 dark:bg-dark-800/60 rounded-xl border border-gray-200/80 dark:border-white/5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Publish to Storefront</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                When enabled, this post will be immediately visible on your /blog storefront directory.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>
        </div>
      </form>
    </AdminLayout>
  )
}
