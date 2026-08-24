/**
 * useCatalogSearch Hook
 * 
 * Provides a clean React interface for:
 * - Real-time input handling with immediate visual responsiveness
 * - Debounced index searching and ranking
 * - Fast prefix, multi-word, and fuzzy search results
 * - Instant autocomplete search suggestions
 * - Automatic search index lifecycle management
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ProductSearchEngine } from '../lib/search/searchEngine'
import type { SearchResult, SearchSuggestion, SearchOptions } from '../lib/search/searchEngine'
import type { Product } from '../types'

export interface UseCatalogSearchOptions {
  debounceMs?: number
  enableFuzzy?: boolean
  storeId?: string | null
  categoryIds?: string[]
  maxSuggestions?: number
  initialQuery?: string
}

export function useCatalogSearch(
  products: Product[] | undefined,
  options: UseCatalogSearchOptions = {}
) {
  const {
    debounceMs = 180,
    enableFuzzy = true,
    storeId = null,
    categoryIds,
    maxSuggestions = 6,
    initialQuery = '',
  } = options

  // Immediate input state (responsive visual typing)
  const [searchTerm, setSearchTerm] = useState<string>(initialQuery)
  
  // Debounced search term for computing expensive search results
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery.trim())

  // Engine instance reference
  const engineRef = useRef<ProductSearchEngine>(new ProductSearchEngine())

  // Synchronize initialQuery if it changes externally
  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== searchTerm) {
      setSearchTerm(initialQuery)
      setDebouncedQuery(initialQuery.trim())
    }
  }, [initialQuery])

  // Debounce the query update
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim())
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])

  // Maintain and update the search index when product data updates
  useEffect(() => {
    if (products && Array.isArray(products)) {
      engineRef.current.indexProducts(products)
    }
  }, [products])

  // Compute search results based on debounced query
  const searchResultsWithScores = useMemo<SearchResult[]>(() => {
    if (!products || products.length === 0) return []

    const searchOpts: SearchOptions = {
      enableFuzzy,
      storeId,
      categoryIds,
    }

    return engineRef.current.searchWithScores(debouncedQuery, searchOpts)
  }, [products, debouncedQuery, enableFuzzy, storeId, categoryIds])

  const searchResults = useMemo<Product[]>(() => {
    return searchResultsWithScores.map(r => r.product)
  }, [searchResultsWithScores])

  // Compute suggestions (can respond quickly even to partial input)
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const queryToUse = searchTerm.trim().length >= 1 ? searchTerm.trim() : debouncedQuery
    if (!queryToUse) return []
    return engineRef.current.getSuggestions(queryToUse, maxSuggestions)
  }, [searchTerm, debouncedQuery, maxSuggestions])

  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setDebouncedQuery('')
  }, [])

  return {
    searchTerm,
    setSearchTerm,
    debouncedQuery,
    searchResults,
    searchResultsWithScores,
    suggestions,
    isSearching: debouncedQuery.length > 0,
    hasResults: searchResults.length > 0,
    totalIndexed: engineRef.current.productCount,
    clearSearch,
  }
}
