/**
 * Product Search Engine
 * 
 * High-performance, in-memory search engine combining:
 * 1. Trie prefix index for fast token and multi-word lookups
 * 2. Damerau-Levenshtein fuzzy matching for typo tolerance
 * 3. Multi-field weighted scoring and relevance ranking
 * 4. Search suggestion and autocomplete generation
 */

import { Trie, normalizeSearchText, tokenizeText } from './trie'
import { findFuzzyMatches } from './fuzzy'
import type { Product } from '../../types'

export interface SearchMatchDetails {
  matchTier: number // 1: Exact Name, 2: Name Prefix, 3: Name Contains, 4: Brand Prefix, 5: Brand Contains, 6: Category, 7: Features/Specs, 8: Desc, 9: Fuzzy
  score: number
  matchedTerms: string[]
  isFuzzy: boolean
}

export interface SearchResult {
  product: Product
  score: number
  matchTier: number
  isFuzzy: boolean
}

export interface SearchSuggestion {
  id: string
  title: string
  type: 'product' | 'category' | 'brand'
  slug?: string
  product?: Product
  subtitle?: string
}

export interface SearchOptions {
  limit?: number
  minScore?: number
  enableFuzzy?: boolean
  storeId?: string | null
  categoryIds?: string[]
}

// Normalized product cache to avoid repeatedly cleaning text on every search
interface IndexedProductData {
  product: Product
  normalizedTitle: string
  titleTokens: string[]
  normalizedBrand: string
  brandTokens: string[]
  normalizedCategory: string
  categoryTokens: string[]
  featureTokens: string[]
  normalizedDescription: string
}

export class ProductSearchEngine {
  // Master product registry by ID
  private productsMap: Map<string, Product> = new Map()
  private indexedDataMap: Map<string, IndexedProductData> = new Map()

  // Trie indices for fast prefix lookups
  private titleTrie: Trie = new Trie()
  private brandTrie: Trie = new Trie()
  private categoryTrie: Trie = new Trie()
  private generalTrie: Trie = new Trie() // Features, specs, description tokens

  // Unique categories and brands for quick lookup & suggestions
  private uniqueCategories: Set<string> = new Set()
  private uniqueBrands: Set<string> = new Set()

  constructor(initialProducts?: Product[]) {
    if (initialProducts && initialProducts.length > 0) {
      this.indexProducts(initialProducts)
    }
  }

  /**
   * Clears and indexes a full collection of products.
   */
  public indexProducts(products: Product[]): void {
    this.clear()
    for (const product of products) {
      this.addProduct(product)
    }
  }

  /**
   * Clears all indexed data and resets tries.
   */
  public clear(): void {
    this.productsMap.clear()
    this.indexedDataMap.clear()
    this.titleTrie.clear()
    this.brandTrie.clear()
    this.categoryTrie.clear()
    this.generalTrie.clear()
    this.uniqueCategories.clear()
    this.uniqueBrands.clear()
  }

  /**
   * Adds or updates a single product in the search index.
   */
  public addProduct(product: Product): void {
    if (!product || !product.id) return

    // If product already exists, remove it first
    if (this.productsMap.has(product.id)) {
      this.removeProduct(product.id)
    }

    this.productsMap.set(product.id, product)

    // Normalize searchable fields
    const normalizedTitle = normalizeSearchText(product.title || '')
    const titleTokens = tokenizeText(product.title || '')

    const normalizedBrand = normalizeSearchText(product.brand || '')
    const brandTokens = tokenizeText(product.brand || '')

    const normalizedCategory = normalizeSearchText(product.category || '')
    const categoryTokens = tokenizeText(product.category || '')

    // Extract feature and spec tokens
    const featureTokensSet = new Set<string>()
    if (Array.isArray(product.key_features)) {
      for (const feature of product.key_features) {
        for (const token of tokenizeText(feature)) {
          featureTokensSet.add(token)
        }
      }
    }
    if (product.specs && typeof product.specs === 'object') {
      for (const val of Object.values(product.specs)) {
        if (typeof val === 'string') {
          for (const token of tokenizeText(val)) {
            featureTokensSet.add(token)
          }
        }
      }
    }
    const featureTokens = Array.from(featureTokensSet)

    const normalizedDescription = normalizeSearchText(product.description || '')
    const descriptionTokens = tokenizeText(product.description || '')

    // Store indexed representation
    this.indexedDataMap.set(product.id, {
      product,
      normalizedTitle,
      titleTokens,
      normalizedBrand,
      brandTokens,
      normalizedCategory,
      categoryTokens,
      featureTokens,
      normalizedDescription,
    })

    // Index title tokens & title phrases
    for (const token of titleTokens) {
      this.titleTrie.insert(token, product.id)
    }
    // Also index whole title if multi-word so "iphone 15 pro" matches as a single phrase prefix
    if (titleTokens.length > 1) {
      this.titleTrie.insert(normalizedTitle, product.id)
    }

    // Index brand
    if (normalizedBrand) {
      this.uniqueBrands.add(product.brand!)
      for (const token of brandTokens) {
        this.brandTrie.insert(token, product.id)
      }
    }

    // Index category
    if (normalizedCategory) {
      this.uniqueCategories.add(product.category)
      for (const token of categoryTokens) {
        this.categoryTrie.insert(token, product.id)
      }
    }

    // Index features, specs, and description in general trie
    for (const token of featureTokens) {
      this.generalTrie.insert(token, product.id)
    }
    for (const token of descriptionTokens) {
      this.generalTrie.insert(token, product.id)
    }
  }

  /**
   * Removes a product by ID from the search index.
   */
  public removeProduct(productId: string): void {
    const existing = this.indexedDataMap.get(productId)
    if (!existing) return

    // Remove from title trie
    for (const token of existing.titleTokens) {
      this.titleTrie.remove(token, productId)
    }
    if (existing.titleTokens.length > 1) {
      this.titleTrie.remove(existing.normalizedTitle, productId)
    }

    // Remove from brand trie
    for (const token of existing.brandTokens) {
      this.brandTrie.remove(token, productId)
    }

    // Remove from category trie
    for (const token of existing.categoryTokens) {
      this.categoryTrie.remove(token, productId)
    }

    // Remove from general trie
    for (const token of existing.featureTokens) {
      this.generalTrie.remove(token, productId)
    }
    for (const token of tokenizeText(existing.normalizedDescription)) {
      this.generalTrie.remove(token, productId)
    }

    this.productsMap.delete(productId)
    this.indexedDataMap.delete(productId)
  }

  /**
   * Fast candidate retrieval via Trie prefix search.
   */
  private getPrefixCandidates(tokens: string[]): Set<string> {
    if (tokens.length === 0) return new Set()

    const candidateSets: Set<string>[] = []

    for (const token of tokens) {
      const tokenCandidates = new Set<string>()

      // Check title trie
      for (const id of this.titleTrie.searchPrefix(token)) {
        tokenCandidates.add(id)
      }
      // Check brand trie
      for (const id of this.brandTrie.searchPrefix(token)) {
        tokenCandidates.add(id)
      }
      // Check category trie
      for (const id of this.categoryTrie.searchPrefix(token)) {
        tokenCandidates.add(id)
      }
      // Check general trie
      for (const id of this.generalTrie.searchPrefix(token)) {
        tokenCandidates.add(id)
      }

      candidateSets.push(tokenCandidates)
    }

    if (candidateSets.length === 0) return new Set()

    // Perform intersection for multi-token queries so all terms are matched if possible
    let combinedCandidates = new Set(candidateSets[0])
    for (let i = 1; i < candidateSets.length; i++) {
      const currentSet = candidateSets[i]
      const intersection = new Set<string>()
      for (const id of combinedCandidates) {
        if (currentSet.has(id)) {
          intersection.add(id)
        }
      }
      // If intersection is non-empty, narrow down. If empty, fall back to union to not drop matches
      if (intersection.size > 0) {
        combinedCandidates = intersection
      } else {
        for (const id of currentSet) {
          combinedCandidates.add(id)
        }
      }
    }

    return combinedCandidates
  }

  /**
   * Computes multi-tier relevance score for a product against query and query tokens.
   */
  private scoreProduct(
    productId: string,
    normalizedQuery: string,
    queryTokens: string[],
    isFuzzyCandidate: boolean = false,
    fuzzySimilarity: number = 1.0
  ): SearchMatchDetails | null {
    const data = this.indexedDataMap.get(productId)
    if (!data) return null

    const {
      product,
      normalizedTitle,
      normalizedBrand,
      normalizedCategory,
      featureTokens,
      normalizedDescription,
    } = data

    let score = 0
    let matchTier = 10 // Higher number = lower priority
    const matchedTerms: string[] = []

    // 1. Exact Product Name match (Highest priority)
    if (normalizedTitle === normalizedQuery) {
      matchTier = Math.min(matchTier, 1)
      score += 1200
    }
    // 2. Product Name starts with query
    else if (normalizedTitle.startsWith(normalizedQuery)) {
      matchTier = Math.min(matchTier, 2)
      score += 900 + (normalizedQuery.length / Math.max(1, normalizedTitle.length)) * 100
    }
    // 3. Product Name contains query phrase
    else if (normalizedTitle.includes(normalizedQuery)) {
      matchTier = Math.min(matchTier, 3)
      score += 700
    }

    // 4. Brand starts with query
    if (normalizedBrand && normalizedBrand.startsWith(normalizedQuery)) {
      matchTier = Math.min(matchTier, 4)
      score += 600
    }
    // 5. Brand contains query
    else if (normalizedBrand && normalizedBrand.includes(normalizedQuery)) {
      matchTier = Math.min(matchTier, 5)
      score += 480
    }

    // 6. Category match
    if (normalizedCategory && normalizedCategory.includes(normalizedQuery)) {
      matchTier = Math.min(matchTier, 6)
      score += 350
    }

    // Individual Token Matching & Feature/Description scoring
    let allTokensMatched = true
    let tokenMatchesCount = 0

    for (const token of queryTokens) {
      let tokenMatched = false

      // Title token match
      if (data.titleTokens.some(t => t.startsWith(token))) {
        score += 80
        tokenMatched = true
        matchedTerms.push(token)
      } else if (data.titleTokens.some(t => t.includes(token))) {
        score += 40
        tokenMatched = true
        matchedTerms.push(token)
      }

      // Brand token match
      if (data.brandTokens.some(t => t.startsWith(token))) {
        score += 60
        tokenMatched = true
      }

      // Category token match
      if (data.categoryTokens.some(t => t.startsWith(token))) {
        score += 45
        tokenMatched = true
      }

      // 7. Key features & Specs match
      if (featureTokens.some(t => t.startsWith(token))) {
        matchTier = Math.min(matchTier, 7)
        score += 30
        tokenMatched = true
      }

      // 8. Description match
      if (normalizedDescription.includes(token)) {
        matchTier = Math.min(matchTier, 8)
        score += 15
        tokenMatched = true
      }

      if (tokenMatched) {
        tokenMatchesCount++
      } else {
        allTokensMatched = false
      }
    }

    // Bonus for matching all query tokens
    if (allTokensMatched && queryTokens.length > 1) {
      score += 150 * queryTokens.length
    } else {
      score += tokenMatchesCount * 25
    }

    // 9. Fuzzy match adjustments
    if (isFuzzyCandidate) {
      matchTier = Math.min(matchTier, 9)
      score += Math.round(180 * fuzzySimilarity)
    }

    // Secondary boosts
    // Featured product bonus
    if (product.is_featured) {
      score += 15
    }
    // Stock bonus (in-stock items slightly preferred over out of stock)
    if (product.stock_status === 'in_stock') {
      score += 10
    } else if (product.stock_status === 'few_units_left') {
      score += 5
    }

    if (score <= 0) return null

    return {
      matchTier,
      score,
      matchedTerms,
      isFuzzy: isFuzzyCandidate && matchTier === 9,
    }
  }

  /**
   * Main Search Method
   * Executes Trie prefix lookup, optional fuzzy search fallback/augmentation,
   * scoring and ranking.
   */
  public search(query: string, options: SearchOptions = {}): Product[] {
    const results = this.searchWithScores(query, options)
    return results.map(r => r.product)
  }

  /**
   * Search method returning full ranked results with metadata and scores.
   */
  public searchWithScores(query: string, options: SearchOptions = {}): SearchResult[] {
    const normalizedQuery = normalizeSearchText(query)
    if (!normalizedQuery) {
      // Return all products when search is empty
      const all = Array.from(this.productsMap.values())
      return all.map(p => ({
        product: p,
        score: p.is_featured ? 10 : 0,
        matchTier: 10,
        isFuzzy: false,
      }))
    }

    const queryTokens = tokenizeText(normalizedQuery)
    if (queryTokens.length === 0) return []

    const candidates = this.getPrefixCandidates(queryTokens)
    const candidateScoreMap = new Map<string, SearchResult>()

    // Score all Trie prefix candidates
    for (const productId of candidates) {
      const match = this.scoreProduct(productId, normalizedQuery, queryTokens, false)
      if (match) {
        const product = this.productsMap.get(productId)!
        candidateScoreMap.set(productId, {
          product,
          score: match.score,
          matchTier: match.matchTier,
          isFuzzy: match.isFuzzy,
        })
      }
    }

    // If results are few or fuzzy is explicitly enabled, perform fuzzy search against vocabulary
    const enableFuzzy = options.enableFuzzy !== false
    const shouldRunFuzzy = enableFuzzy && queryTokens.some(t => t.length >= 3) && candidateScoreMap.size < 20

    if (shouldRunFuzzy) {
      const vocab = this.titleTrie.getVocabulary()
      const brandVocab = this.brandTrie.getVocabulary()
      const combinedVocab = Array.from(new Set([...vocab, ...brandVocab]))

      for (const token of queryTokens) {
        if (token.length < 3) continue

        const fuzzyWords = findFuzzyMatches(token, combinedVocab)
        for (const { word, similarity } of fuzzyWords) {
          // Get product IDs for fuzzy word from title and brand tries
          const fuzzyProductIds = new Set([
            ...this.titleTrie.searchExact(word),
            ...this.brandTrie.searchExact(word),
          ])

          for (const productId of fuzzyProductIds) {
            if (candidateScoreMap.has(productId)) continue // Already scored
            const match = this.scoreProduct(productId, normalizedQuery, queryTokens, true, similarity)
            if (match) {
              const product = this.productsMap.get(productId)!
              candidateScoreMap.set(productId, {
                product,
                score: match.score,
                matchTier: match.matchTier,
                isFuzzy: true,
              })
            }
          }
        }
      }
    }

    // Convert map to array and filter options (storeId, categoryIds)
    let ranked = Array.from(candidateScoreMap.values())

    if (options.storeId) {
      ranked = ranked.filter(r => r.product.store_id === options.storeId)
    }

    if (options.categoryIds && options.categoryIds.length > 0) {
      const catIdSet = new Set(options.categoryIds)
      ranked = ranked.filter(r => r.product.category_id && catIdSet.has(r.product.category_id))
    }

    // Sort by Match Tier (ascending: Tier 1 > Tier 2 > ...) then Score (descending)
    ranked.sort((a, b) => {
      if (a.matchTier !== b.matchTier) {
        return a.matchTier - b.matchTier
      }
      if (b.score !== a.score) {
        return b.score - a.score
      }
      // Tie-breaker: Newer products first
      return new Date(b.product.created_at || 0).getTime() - new Date(a.product.created_at || 0).getTime()
    })

    if (options.limit && options.limit > 0) {
      ranked = ranked.slice(0, options.limit)
    }

    return ranked
  }

  /**
   * Fast Search Suggestions Generator
   * Produces autocomplete suggestions for product titles, brands, and categories.
   */
  public getSuggestions(query: string, limit: number = 6): SearchSuggestion[] {
    const normalizedQuery = normalizeSearchText(query)
    if (!normalizedQuery || normalizedQuery.length < 1) return []

    const suggestions: SearchSuggestion[] = []
    const seenTitles = new Set<string>()

    // 1. Top matching product items
    const productResults = this.searchWithScores(query, { limit: limit })

    for (const res of productResults) {
      const p = res.product
      if (!seenTitles.has(p.title.toLowerCase())) {
        seenTitles.add(p.title.toLowerCase())
        suggestions.push({
          id: p.id,
          title: p.title,
          type: 'product',
          slug: p.slug,
          product: p,
          subtitle: p.brand ? `${p.brand} • ${p.category || 'Product'}` : p.category,
        })
      }
      if (suggestions.length >= limit) break
    }

    // 2. Matching brands (if limit not reached)
    if (suggestions.length < limit) {
      for (const brand of this.uniqueBrands) {
        if (
          brand.toLowerCase().startsWith(normalizedQuery) &&
          !seenTitles.has(brand.toLowerCase())
        ) {
          seenTitles.add(brand.toLowerCase())
          suggestions.push({
            id: `brand-${brand}`,
            title: brand,
            type: 'brand',
            subtitle: 'Brand',
          })
          if (suggestions.length >= limit) break
        }
      }
    }

    // 3. Matching categories (if limit not reached)
    if (suggestions.length < limit) {
      for (const category of this.uniqueCategories) {
        if (
          category.toLowerCase().startsWith(normalizedQuery) &&
          !seenTitles.has(category.toLowerCase())
        ) {
          seenTitles.add(category.toLowerCase())
          suggestions.push({
            id: `cat-${category}`,
            title: category,
            type: 'category',
            subtitle: 'Category',
          })
          if (suggestions.length >= limit) break
        }
      }
    }

    return suggestions.slice(0, limit)
  }

  /**
   * Returns current count of indexed products.
   */
  public get productCount(): number {
    return this.productsMap.size
  }
}
