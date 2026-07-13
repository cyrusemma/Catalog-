import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Tag, 
  Plus, 
  Trash, 
  X, 
  Percent
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'
import { useAdminContext } from '../../hooks/useAdminContext'

export default function AdminDiscounts() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [code, setCode] = useState('')
  const [type, setType] = useState<'storewide' | 'category' | 'product'>('storewide')
  const [targetId, setTargetId] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState('')
  const [minOrderAmount, setMinOrderAmount] = useState('0')
  const [active, setActive] = useState(true)

  const qc = useQueryClient()
  const { data: context } = useAdminContext()

  // Fetch Discounts
  const { data: discounts, isLoading: discountsLoading } = useQuery({
    queryKey: ['admin-discounts', context?.storeId],
    queryFn: async () => {
      if (!context?.storeId) return []
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('store_id', context.storeId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!context?.storeId,
  })

  // Fetch Store Products (for product/category selections)
  const { data: products } = useQuery({
    queryKey: ['admin-products-for-discounts', context?.storeId],
    queryFn: async () => {
      if (!context?.storeId) return []
      const { data, error } = await supabase
        .from('products')
        .select('id, title, category')
        .eq('store_id', context.storeId)
      if (error) throw error
      return data || []
    },
    enabled: !!context?.storeId,
  })

  // Get unique categories of this store
  const categories = Array.from(new Set(products?.map(p => p.category).filter(Boolean))) as string[]

  // Mutations
  const createDiscount = useMutation({
    mutationFn: async (newDiscount: any) => {
      const { error } = await supabase
        .from('discounts')
        .insert({
          ...newDiscount,
          store_id: context?.storeId,
        })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-discounts'] })
      toast.success('Discount rule created successfully!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err: any) => {
      toast.error(`Failed to create discount: ${err.message}`)
    }
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('discounts')
        .update({ active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-discounts'] })
      toast.success('Discount status updated')
    },
    onError: (err: any) => {
      toast.error(`Failed to update status: ${err.message}`)
    }
  })

  const deleteDiscount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-discounts'] })
      toast.success('Discount rule deleted successfully')
    },
    onError: (err: any) => {
      toast.error(`Failed to delete discount: ${err.message}`)
    }
  })

  const resetForm = () => {
    setCode('')
    setType('storewide')
    setTargetId('')
    setDiscountType('percentage')
    setValue('')
    setMinOrderAmount('0')
    setActive(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const valNum = parseFloat(value)
    if (Number.isNaN(valNum) || valNum <= 0) {
      toast.error('Discount value must be greater than zero')
      return
    }
    if (discountType === 'percentage' && valNum > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return
    }

    createDiscount.mutate({
      code: code.trim() || null,
      type,
      target_id: type === 'storewide' ? null : targetId,
      discount_type: discountType,
      value: valNum,
      min_order_amount: parseFloat(minOrderAmount) || 0,
      active
    })
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Store Promotion</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">Discounts & Coupons</h1>
            <p className="text-sm text-gray-500 mt-1">Configure auto-applied storefront sales or specific coupon promo codes.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-400 hover:bg-brand-500 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            Create Discount Rule
          </button>
        </div>

        {/* Discounts List */}
        {discountsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400" />
          </div>
        ) : discounts && discounts.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Discount / Code</th>
                    <th className="py-4 px-6">Scope / Applies to</th>
                    <th className="py-4 px-6">Reductions</th>
                    <th className="py-4 px-6">Min Order</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {discounts.map((discount: any) => {
                    const isCode = !!discount.code
                    return (
                      <tr key={discount.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          {isCode ? (
                            <span className="font-mono bg-brand-400/10 text-brand-400 font-bold px-3 py-1 rounded-lg border border-brand-400/20 uppercase tracking-wider text-xs">
                              {discount.code}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-gray-500 font-semibold text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                              Auto-Applied
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900 capitalize">
                          {discount.type === 'storewide' && 'Entire Store'}
                          {discount.type === 'category' && `Category: ${discount.target_id}`}
                          {discount.type === 'product' && (
                            <span className="truncate max-w-[200px] inline-block" title={products?.find(p => p.id === discount.target_id)?.title || 'Product ID'}>
                              {products?.find(p => p.id === discount.target_id)?.title || 'Selected Product'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-bold text-gray-900">
                          {discount.discount_type === 'percentage' 
                            ? `${discount.value}% Off` 
                            : `-${formatPrice(discount.value, context?.currency)}`}
                        </td>
                        <td className="py-4 px-6 text-gray-500 font-medium">
                          {discount.min_order_amount > 0 
                            ? formatPrice(discount.min_order_amount, context?.currency) 
                            : 'None'}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            title="Toggle discount status"
                            onClick={() => toggleActive.mutate({ id: discount.id, active: !discount.active })}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${discount.active ? 'bg-brand-400' : 'bg-gray-200'}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${discount.active ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            title="Delete Discount"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this discount rule?')) {
                                deleteDiscount.mutate(discount.id)
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-brand-400/10 text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Percent size={32} weight="duotone" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No discount rules yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">Create coupon promo codes or auto-applied category/product discounts to boost your storefront sales.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} weight="bold" />
              Create your first rule
            </button>
          </div>
        )}

        {/* Create Discount Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Tag size={20} className="text-brand-400" />
                  New Discount Rule
                </h3>
                <button
                  title="Close Modal"
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-150 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Promo Code */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Promo Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER10 (Leave blank for automatic application)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">If blank, this discount will be automatically applied to eligible items in the customer's cart.</p>
                </div>

                {/* Scope Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Applies To
                  </label>
                  <select
                    title="Scope"
                    value={type}
                    onChange={e => {
                      setType(e.target.value as any)
                      setTargetId('')
                    }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all cursor-pointer font-medium"
                  >
                    <option value="storewide">Entire Store</option>
                    <option value="category">Specific Category</option>
                    <option value="product">Specific Product</option>
                  </select>
                </div>

                {/* Target Scope Dropdowns */}
                {type === 'category' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Select Category
                    </label>
                    <select
                      title="Select Category"
                      required
                      value={targetId}
                      onChange={e => setTargetId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all cursor-pointer font-medium"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                )}

                {type === 'product' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Select Product
                    </label>
                    <select
                      title="Select Product"
                      required
                      value={targetId}
                      onChange={e => setTargetId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all cursor-pointer font-medium"
                    >
                      <option value="">-- Choose Product --</option>
                      {products?.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                )}

                {/* Reduction Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Discount Type
                    </label>
                    <select
                      title="Discount Type"
                      value={discountType}
                      onChange={e => setDiscountType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all cursor-pointer font-medium"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Price Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all"
                    />
                  </div>
                </div>

                {/* Minimum Order Value */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Minimum Order Value ({context?.currency || 'GHS'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={minOrderAmount}
                    onChange={e => setMinOrderAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Discount will only apply when cart subtotal meets this amount.</p>
                </div>

                {/* Submit actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      resetForm()
                    }}
                    className="btn-ghost flex-1 py-3 text-sm cursor-pointer rounded-xl border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createDiscount.isPending}
                    className="btn-primary flex-1 py-3 text-sm cursor-pointer rounded-xl font-bold"
                  >
                    {createDiscount.isPending ? 'Saving...' : 'Save Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
