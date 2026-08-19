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
  store?: {
    name: string
    slug: string
    logo_url?: string | null
    markup_percentage?: number
  } | null
}

export interface Order {
  id: string
  customer_name: string
  customer_phone: string
  customer_address: string
  items: OrderItem[]
  subtotal: number
  delivery_fee: number
  discount_amount: number
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
  name?: string | null
  email?: string | null
  rating: number
  message: string
  page_url?: string | null
  survey_responses?: Record<string, number | string> | null
  created_at: string
}

export interface ProductReview {
  id: string
  product_id: string
  store_id: string | null
  customer_id: string | null
  reviewer_name: string | null
  reviewer_email: string | null
  rating: number           // 1–5
  comment: string | null
  status: 'pending' | 'published' | 'hidden'
  created_at: string
}

export interface ProductReviewStats {
  product_id: string
  review_count: number
  avg_rating: number
}

