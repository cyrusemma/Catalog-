export interface Product {
  id: string
  title: string
  slug: string
  description: string
  images: string[]
  source_url?: string
  source_price?: number
  selling_price: number
  original_price?: number
  discount_percent?: number
  stock: number
  stock_status: 'in_stock' | 'few_units_left' | 'out_of_stock'
  delivery_fee: number
  category: string
  category_id: string | null
  sizes: string[]
  colors: string[]
  brand?: string
  specs?: Record<string, string>
  key_features?: string[]
  is_featured: boolean
  is_published: boolean
  is_preorder?: boolean
  flash_sale_price?: number | null
  flash_sale_ends_at?: string | null
  rating?: number
  rating_count?: number
  created_at: string
  store_id?: string | null
  approval_status?: 'pending' | 'approved' | 'rejected'
  is_approved_for_marketplace?: boolean
  marketplace_price?: number | null
}

export interface Order {
  id: string
  customer_name: string
  customer_phone: string
  customer_address: string
  items: OrderItem[]
  total: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  notes?: string
  created_at: string
}

export interface OrderItem {
  product_id: string
  product_title: string
  product_image: string
  quantity: number
  price: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
}

export interface StoreSettings {
  store_name: string
  tagline: string
  whatsapp_number: string
  logo_url?: string
  delivery_fee: number
  currency: string
}

export interface SiteReview {
  id: string
  name?: string
  email?: string
  rating: number
  message: string
  page_url?: string
  created_at: string
}
