import { useState, useMemo } from 'react'
import {
  CurrencyCircleDollar,
  Plus,
  PencilSimple,
  Trash,
  X,
  ArrowUp,
  ArrowDown,
  WarningCircle,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  usePriceRanges,
  useCreatePriceRange,
  useUpdatePriceRange,
  useDeletePriceRange,
  useTogglePriceRangeActive,
  useReorderPriceRanges,
} from '../../hooks/usePriceRanges'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'
import type { PriceRange } from '../../types'

interface RangeFormData {
  id?: string
  name: string
  min_price: string
  max_price: string
  label: string
  sort_order: number
  is_active: boolean
}

const initialFormData: RangeFormData = {
  name: '',
  min_price: '0',
  max_price: '',
  label: '',
  sort_order: 1,
  is_active: true,
}

export default function AdminPriceRanges() {
  const formatPrice = useCurrencyFormatter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRange, setEditingRange] = useState<PriceRange | null>(null)
  const [formData, setFormData] = useState<RangeFormData>(initialFormData)
  const [autoLabel, setAutoLabel] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: ranges = [], isLoading, isError } = usePriceRanges({ onlyActive: false })
  const createMutation = useCreatePriceRange()
  const updateMutation = useUpdatePriceRange()
  const deleteMutation = useDeletePriceRange()
  const toggleActiveMutation = useTogglePriceRangeActive()
  const reorderMutation = useReorderPriceRanges()

  // Generate suggested label automatically based on min and max
  const computeSuggestedLabel = (minStr: string, maxStr: string): string => {
    const min = parseFloat(minStr)
    const max = maxStr ? parseFloat(maxStr) : null

    if (Number.isNaN(min)) return ''
    if (min === 0 && max !== null && !Number.isNaN(max)) {
      return `Under ${formatPrice(max)}`
    }
    if (max === null || Number.isNaN(max) || maxStr === '') {
      return `${formatPrice(min)}+`
    }
    return `${formatPrice(min)} – ${formatPrice(max)}`
  }

  // Detect overlapping active ranges
  const overlappingPairs = useMemo(() => {
    const activeRanges = ranges.filter(r => r.is_active)
    const overlaps: { rangeA: PriceRange; rangeB: PriceRange }[] = []

    for (let i = 0; i < activeRanges.length; i++) {
      for (let j = i + 1; j < activeRanges.length; j++) {
        const a = activeRanges[i]
        const b = activeRanges[j]

        const aMin = a.min_price
        const aMax = a.max_price ?? Infinity
        const bMin = b.min_price
        const bMax = b.max_price ?? Infinity

        // Overlap condition: max(aMin, bMin) < min(aMax, bMax)
        // (Touching boundaries like 0-50 and 50-100 are permitted and standard)
        const overlapStart = Math.max(aMin, bMin)
        const overlapEnd = Math.min(aMax, bMax)

        if (overlapStart < overlapEnd && !(aMax === bMin || bMax === aMin)) {
          overlaps.push({ rangeA: a, rangeB: b })
        }
      }
    }

    return overlaps
  }, [ranges])

  const openCreateModal = () => {
    setEditingRange(null)
    const nextOrder = ranges.length > 0 ? Math.max(...ranges.map(r => r.sort_order || 0)) + 1 : 1
    setFormData({
      ...initialFormData,
      sort_order: nextOrder,
      label: 'Under GH₵50',
    })
    setAutoLabel(true)
    setIsModalOpen(true)
  }

  const openEditModal = (range: PriceRange) => {
    setEditingRange(range)
    setFormData({
      id: range.id,
      name: range.name,
      min_price: range.min_price.toString(),
      max_price: range.max_price !== null ? range.max_price.toString() : '',
      label: range.label,
      sort_order: range.sort_order,
      is_active: range.is_active,
    })
    setAutoLabel(false)
    setIsModalOpen(true)
  }

  const handleMinChange = (val: string) => {
    setFormData(prev => {
      const next = { ...prev, min_price: val }
      if (autoLabel) {
        next.label = computeSuggestedLabel(val, next.max_price)
      }
      return next
    })
  }

  const handleMaxChange = (val: string) => {
    setFormData(prev => {
      const next = { ...prev, max_price: val }
      if (autoLabel) {
        next.label = computeSuggestedLabel(next.min_price, val)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const minNum = parseFloat(formData.min_price)
    const maxNum = formData.max_price ? parseFloat(formData.max_price) : null

    if (Number.isNaN(minNum) || minNum < 0) {
      toast.error('Minimum price cannot be negative.')
      return
    }

    if (maxNum !== null) {
      if (Number.isNaN(maxNum) || maxNum < 0) {
        toast.error('Maximum price must be a valid positive number.')
        return
      }
      if (maxNum < minNum) {
        toast.error('Maximum price must be greater than or equal to minimum price.')
        return
      }
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a name for the price range.')
      return
    }

    const labelToUse = formData.label.trim() || computeSuggestedLabel(formData.min_price, formData.max_price)

    try {
      if (editingRange) {
        await updateMutation.mutateAsync({
          id: editingRange.id,
          name: formData.name.trim(),
          min_price: minNum,
          max_price: maxNum,
          label: labelToUse,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        toast.success('Price range updated successfully!')
      } else {
        await createMutation.mutateAsync({
          name: formData.name.trim(),
          min_price: minNum,
          max_price: maxNum,
          label: labelToUse,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        toast.success('Price range created successfully!')
      }
      setIsModalOpen(false)
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to save price range: ${err.message || 'Unknown error'}`)
    }
  }

  const handleToggleActive = async (range: PriceRange) => {
    try {
      await toggleActiveMutation.mutateAsync({
        id: range.id,
        is_active: !range.is_active,
      })
      toast.success(`Price range "${range.name}" is now ${!range.is_active ? 'active' : 'inactive'}.`)
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirmId(null)
      toast.success('Price range deleted.')
    } catch (err: any) {
      toast.error(`Failed to delete price range: ${err.message}`)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= ranges.length) return

    const newOrder = [...ranges]
    const temp = newOrder[index]
    newOrder[index] = newOrder[targetIndex]
    newOrder[targetIndex] = temp

    try {
      await reorderMutation.mutateAsync(newOrder.map(r => r.id))
      toast.success('Display order updated.')
    } catch (err: any) {
      toast.error(`Failed to reorder: ${err.message}`)
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-400/10 text-brand-500 flex items-center justify-center">
                <CurrencyCircleDollar size={22} weight="duotone" />
              </div>
              Price Ranges
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Configure price filter brackets for the customer-facing Catalog and Marketplace.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus size={16} weight="bold" /> Add Price Range
          </button>
        </div>

        {/* Overlapping Warning Banner */}
        {overlappingPairs.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-800 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
              <WarningCircle size={18} weight="fill" className="text-amber-500 flex-shrink-0" />
              Notice: Overlapping Price Ranges Detected
            </div>
            <p className="text-amber-800/80 dark:text-amber-200/80">
              Some of your active price ranges overlap. Products within the overlapping bracket will appear when either filter is selected:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-2 font-medium">
              {overlappingPairs.map(({ rangeA, rangeB }, idx) => (
                <li key={idx}>
                  <strong>{rangeA.name}</strong> ({rangeA.label}) overlaps with <strong>{rangeB.name}</strong> ({rangeB.label})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ranges List / Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading price ranges...
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-red-500 text-sm">
              Failed to load price ranges. Check your database migration.
            </div>
          ) : ranges.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-3">
              <CurrencyCircleDollar size={44} weight="duotone" className="mx-auto text-gray-300" />
              <p className="font-semibold text-gray-700">No price ranges configured</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Add price brackets so customers can filter products by budget on the shop page.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-400 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus size={14} weight="bold" /> Create First Range
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Order</th>
                    <th className="py-3 px-4">Display Label</th>
                    <th className="py-3 px-4">Internal Name</th>
                    <th className="py-3 px-4">Price Bracket</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ranges.map((range, index) => (
                    <tr
                      key={range.id}
                      className={`hover:bg-gray-50/60 transition-colors ${!range.is_active ? 'opacity-60 bg-gray-50/30' : ''}`}
                    >
                      {/* Order Controls */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Move Up"
                            disabled={index === 0}
                            onClick={() => handleMove(index, 'up')}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                          >
                            <ArrowUp size={13} weight="bold" />
                          </button>
                          <span className="font-mono text-xs font-semibold text-gray-600 w-4 text-center">
                            {range.sort_order}
                          </span>
                          <button
                            type="button"
                            title="Move Down"
                            disabled={index === ranges.length - 1}
                            onClick={() => handleMove(index, 'down')}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                          >
                            <ArrowDown size={13} weight="bold" />
                          </button>
                        </div>
                      </td>

                      {/* Display Label */}
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {range.label}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {range.name}
                      </td>

                      {/* Bracket Numbers */}
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                        {range.max_price !== null ? (
                          <span>{formatPrice(range.min_price)} &rarr; {formatPrice(range.max_price)}</span>
                        ) : (
                          <span>&ge; {formatPrice(range.min_price)} (Open-ended)</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(range)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            range.is_active
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {range.is_active ? (
                            <>
                              <Eye size={12} weight="bold" /> Active
                            </>
                          ) : (
                            <>
                              <EyeSlash size={12} weight="bold" /> Inactive
                            </>
                          )}
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(range)}
                            title="Edit range"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                          >
                            <PencilSimple size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(range.id)}
                            title="Delete range"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Modal Dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <CurrencyCircleDollar size={20} weight="duotone" className="text-brand-400" />
                  {editingRange ? 'Edit Price Range' : 'Create New Price Range'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Range Name (Internal)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Budget, Mid Range, Premium"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 text-gray-900"
                  />
                </div>

                {/* Min & Max inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Min Price (GH₵)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0"
                      value={formData.min_price}
                      onChange={e => handleMinChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 text-gray-900 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Max Price (GH₵)
                      </label>
                      <span className="text-[10px] text-gray-400">Blank = no max (+)</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Leave blank for +"
                      value={formData.max_price}
                      onChange={e => handleMaxChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 text-gray-900 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Display Label */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                      Customer Display Label
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = computeSuggestedLabel(formData.min_price, formData.max_price)
                        setFormData(prev => ({ ...prev, label: suggested }))
                        setAutoLabel(true)
                      }}
                      className="text-[10px] text-brand-500 font-semibold hover:underline"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Under GH₵50, GH₵50 – GH₵100, GH₵500+"
                    value={formData.label}
                    onChange={e => {
                      setAutoLabel(false)
                      setFormData(prev => ({ ...prev, label: e.target.value }))
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 text-gray-900"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    This is the label shoppers will see on the filter pill in the shop.
                  </p>
                </div>

                {/* Sort order & Active toggle */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Display Position
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.sort_order}
                      onChange={e => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 text-gray-900 font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 border-gray-300"
                      />
                      <span className="text-xs font-bold text-gray-700">Active (Visible)</span>
                    </label>
                  </div>
                </div>

                {/* Submit & Cancel */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    {editingRange ? 'Save Changes' : 'Create Range'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <Trash size={24} weight="duotone" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Delete Price Range?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This range will no longer be available in catalog filters. Existing product prices are not affected.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
