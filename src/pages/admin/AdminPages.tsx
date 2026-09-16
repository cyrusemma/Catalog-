import { useState, useEffect } from 'react'
import { 
  FileText, 
  Plus, 
  Save, 
  Trash2, 
  ExternalLink, 
  HelpCircle,
  Shield,
  FileCode,
  Info,
  Globe
} from 'lucide-react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import AdminLayout from '../../components/admin/AdminLayout'
import { useCustomPages, useUpsertCustomPage, useDeleteCustomPage } from '../../hooks/useCms'
import { toast } from 'sonner'

const PRESET_PAGES = [
  { slug: 'terms', title: 'Terms of Service', icon: FileText, desc: 'Store usage terms, order conditions, and merchant rules.' },
  { slug: 'privacy', title: 'Privacy Policy', icon: Shield, desc: 'Customer data collection, privacy rights, and merchant data sharing.' },
  { slug: 'about', title: 'About Us', icon: Info, desc: 'Our story, values, mission, and why customers love shopping with us.' },
  { slug: 'faq', title: 'Frequently Asked Questions', icon: HelpCircle, desc: 'Shipping, payment methods, delivery timelines, and returns.' },
]

export default function AdminPages() {
  const { data: pages = [] } = useCustomPages()
  const upsertMutation = useUpsertCustomPage()
  const deleteMutation = useDeleteCustomPage()

  const [activeSlug, setActiveSlug] = useState<string>('terms')
  const [title, setTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)
  const [newCustomSlug, setNewCustomSlug] = useState('')
  const [newCustomTitle, setNewCustomTitle] = useState('')


  // Sync active page data
  useEffect(() => {
    const existing = pages.find(p => p.slug === activeSlug)
    if (existing) {
      setTitle(existing.title || '')
      setContentHtml(existing.content_html || '')
      setMetaTitle(existing.meta_title || '')
      setMetaDescription(existing.meta_description || '')
      setIsPublished(existing.is_published !== false)
    } else {
      // Find preset title if it's a known preset
      const preset = PRESET_PAGES.find(p => p.slug === activeSlug)
      setTitle(preset ? preset.title : '')
      setContentHtml('')
      setMetaTitle(preset ? `${preset.title} | Store` : '')
      setMetaDescription('')
      setIsPublished(true)
    }
  }, [activeSlug, pages])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Page title is required')
      return
    }

    try {
      await upsertMutation.mutateAsync({
        slug: activeSlug,
        title: title.trim(),
        content_html: contentHtml,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        is_published: isPublished,
      })
      toast.success(`Page "${title}" saved successfully!`)
    } catch (err: any) {
      toast.error('Failed to save page: ' + err.message)
    }
  }

  const handleCreateCustom = async () => {
    if (!newCustomTitle.trim() || !newCustomSlug.trim()) {
      toast.error('Please enter both title and slug')
      return
    }

    const cleanSlug = newCustomSlug
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')

    try {
      await upsertMutation.mutateAsync({
        slug: cleanSlug,
        title: newCustomTitle.trim(),
        content_html: `<p>Welcome to ${newCustomTitle.trim()}</p>`,
        is_published: true,
      })
      setActiveSlug(cleanSlug)
      setIsCreatingCustom(false)
      setNewCustomTitle('')
      setNewCustomSlug('')
      toast.success('New page created!')
    } catch (err: any) {
      toast.error('Failed to create page: ' + err.message)
    }
  }

  const handleDelete = async (id: string, slug: string) => {
    if (PRESET_PAGES.some(p => p.slug === slug)) {
      if (!confirm(`Are you sure you want to reset "${slug}" page content to default?`)) return
    } else {
      if (!confirm(`Are you sure you want to delete custom page "${slug}"?`)) return
    }

    try {
      await deleteMutation.mutateAsync(id)
      setActiveSlug('terms')
      toast.success('Page removed')
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  const activePageObj = pages.find(p => p.slug === activeSlug)

  const modules = {

    toolbar: [
      [{ header: [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean'],
    ],
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-7 h-7 text-amber-500" />
              Pages & Legal CMS
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create and edit informational pages, Terms of Service, Privacy Policy, FAQs, and custom content.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreatingCustom(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Custom Page
            </button>
            <button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {upsertMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Modal to Create Custom Page */}
        {isCreatingCustom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Custom Page</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                  Page Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sizing Guide, Return Policy"
                  value={newCustomTitle}
                  onChange={(e) => {
                    setNewCustomTitle(e.target.value)
                    setNewCustomSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, '')
                        .replace(/[\s_-]+/g, '-')
                        .replace(/^-+|-+$/g, '')
                    )
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-gray-100 dark:bg-dark-800/80 border border-r-0 border-gray-200 dark:border-white/10 rounded-l-xl text-xs text-gray-500">
                    /p/
                  </span>
                  <input
                    type="text"
                    placeholder="sizing-guide"
                    value={newCustomSlug}
                    onChange={(e) => setNewCustomSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-r-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreatingCustom(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustom}
                  className="px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Layout Grid: Sidebar Tabs + Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Pages Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-white/5 p-3 space-y-1 shadow-sm">
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Standard Pages
              </p>
              {PRESET_PAGES.map((preset) => {
                const Icon = preset.icon
                const isActive = activeSlug === preset.slug
                const isCustomized = pages.some(p => p.slug === preset.slug)

                return (
                  <button
                    key={preset.slug}
                    onClick={() => setActiveSlug(preset.slug)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{preset.title}</span>
                    </div>
                    {isCustomized && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-amber-500'}`} />
                    )}
                  </button>
                )
              })}

              {/* Custom Created Pages */}
              {pages.filter(p => !PRESET_PAGES.some(preset => preset.slug === p.slug)).length > 0 && (
                <>
                  <div className="pt-3 pb-1">
                    <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Custom Pages
                    </p>
                  </div>
                  {pages
                    .filter(p => !PRESET_PAGES.some(preset => preset.slug === p.slug))
                    .map((page) => {
                      const isActive = activeSlug === page.slug
                      return (
                        <button
                          key={page.slug}
                          onClick={() => setActiveSlug(page.slug)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FileCode className="w-4 h-4 shrink-0" />
                            <span className="truncate">{page.title}</span>
                          </div>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
                        </button>
                      )
                    })}
                </>
              )}
            </div>
          </div>

          {/* Editor Workspace */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-white/5 p-6 shadow-sm space-y-5">
              {/* Page Status & Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Slug:</span>
                  <code className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-md text-amber-600 dark:text-amber-400 font-mono text-xs">
                    {activeSlug === 'terms' ? '/terms' : activeSlug === 'privacy' ? '/privacy' : activeSlug === 'about' ? '/about' : activeSlug === 'faq' ? '/faq' : `/p/${activeSlug}`}
                  </code>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                    Published on Storefront
                  </label>

                  <a
                    href={activeSlug === 'terms' ? '/terms' : activeSlug === 'privacy' ? '/privacy' : activeSlug === 'about' ? '/about' : activeSlug === 'faq' ? '/faq' : `/p/${activeSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-amber-500 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Live
                  </a>

                  {activePageObj && (
                    <button
                      onClick={() => handleDelete(activePageObj.id, activePageObj.slug)}
                      title="Reset or Delete Page"
                      className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                  Page Heading / Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Terms of Service"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Rich Text Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Page Content (Rich Text / HTML)
                  </label>
                  {!contentHtml && (
                    <span className="text-[11px] text-amber-500 font-medium">
                      (Currently using default fallback template)
                    </span>
                  )}
                </div>
                <div className="quill-dark-wrapper border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-dark-800 min-h-[340px]">
                  <ReactQuill
                    theme="snow"
                    value={contentHtml}
                    onChange={setContentHtml}
                    modules={modules}
                    placeholder="Write your page content here..."
                    className="h-[280px]"
                  />
                </div>
              </div>

              {/* SEO Meta Box */}
              <div className="p-4 bg-gray-50 dark:bg-dark-800/60 rounded-xl border border-gray-200/80 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
                  <Globe className="w-4 h-4 text-amber-500" />
                  SEO & Search Engine Metadata
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      placeholder="Page Title | Store"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-dark-900 border border-gray-200 dark:border-white/10 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Meta Description
                    </label>
                    <input
                      type="text"
                      placeholder="Brief summary for search engines"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-dark-900 border border-gray-200 dark:border-white/10 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
