/**
 * Trie Data Structure for Fast Prefix Search & Token Indexing
 * 
 * Optimized for e-commerce search:
 * - Stores product IDs instead of full objects to avoid memory bloat
 * - Supports token insertion, multi-word indexing, and removal
 * - Case-insensitive & punctuation-normalized
 * - Fast prefix candidate resolution
 * - Vocabulary extraction for fuzzy matching
 */

/**
 * Normalizes a text string by:
 * - Lowercasing
 * - Normalizing unicode characters
 * - Stripping non-alphanumeric punctuation (while preserving spaces and alphanumeric tokens)
 * - Collapsing multiple whitespaces
 */
export function normalizeSearchText(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s-]/g, ' ') // replace punctuation with spaces
    .replace(/[\s_-]+/g, ' ') // collapse consecutive spaces/underscores/dashes
    .trim()
}

/**
 * Splits text into unique, clean searchable tokens.
 * Tokens with length >= 1 are retained.
 */
export function tokenizeText(text: string): string[] {
  const normalized = normalizeSearchText(text)
  if (!normalized) return []
  const parts = normalized.split(/\s+/).filter(Boolean)
  return Array.from(new Set(parts))
}

export class TrieNode {
  // Map child characters to next nodes
  public children: Map<string, TrieNode> = new Map()
  
  // Set of product IDs matching this prefix
  public productIds: Set<string> = new Set()
  
  // Flag indicating if a full word ends at this node
  public isEndOfWord: boolean = false
  
  // Set of product IDs for which this word was an exact full word/token match
  public exactProductIds: Set<string> = new Set()
}

export class Trie {
  private root: TrieNode = new TrieNode()
  private vocabulary: Set<string> = new Set()

  /**
   * Clears the entire Trie index.
   */
  public clear(): void {
    this.root = new TrieNode()
    this.vocabulary.clear()
  }

  /**
   * Inserts a word/token and associates it with a productId.
   * Updates all prefix nodes along the path with the productId.
   */
  public insert(word: string, productId: string): void {
    const cleanWord = normalizeSearchText(word)
    if (!cleanWord || !productId) return

    this.vocabulary.add(cleanWord)

    let current = this.root
    current.productIds.add(productId)

    for (let i = 0; i < cleanWord.length; i++) {
      const char = cleanWord[i]
      let nextNode = current.children.get(char)
      if (!nextNode) {
        nextNode = new TrieNode()
        current.children.set(char, nextNode)
      }
      current = nextNode
      current.productIds.add(productId)
    }

    current.isEndOfWord = true
    current.exactProductIds.add(productId)
  }

  /**
   * Removes a productId association for a specific word/token.
   */
  public remove(word: string, productId: string): void {
    const cleanWord = normalizeSearchText(word)
    if (!cleanWord || !productId) return

    const stack: { node: TrieNode; char: string }[] = []
    let current = this.root
    current.productIds.delete(productId)

    for (let i = 0; i < cleanWord.length; i++) {
      const char = cleanWord[i]
      const nextNode = current.children.get(char)
      if (!nextNode) return // Word not in trie
      stack.push({ node: current, char })
      current = nextNode
      current.productIds.delete(productId)
    }

    current.exactProductIds.delete(productId)
    if (current.exactProductIds.size === 0) {
      current.isEndOfWord = false
      this.vocabulary.delete(cleanWord)
    }

    // Clean up empty nodes from leaf upwards if no product IDs remain
    for (let i = stack.length - 1; i >= 0; i--) {
      const { node, char } = stack[i]
      const child = node.children.get(char)
      if (child && child.productIds.size === 0 && child.children.size === 0) {
        node.children.delete(char)
      }
    }
  }

  /**
   * Searches for all product IDs whose indexed tokens start with the given prefix.
   * Returns a Set of product IDs.
   */
  public searchPrefix(prefix: string): Set<string> {
    const cleanPrefix = normalizeSearchText(prefix)
    if (!cleanPrefix) return new Set()

    let current = this.root
    for (let i = 0; i < cleanPrefix.length; i++) {
      const char = cleanPrefix[i]
      const nextNode = current.children.get(char)
      if (!nextNode) {
        return new Set() // No match
      }
      current = nextNode
    }

    return new Set(current.productIds)
  }

  /**
   * Searches for product IDs that have an exact word match.
   */
  public searchExact(word: string): Set<string> {
    const cleanWord = normalizeSearchText(word)
    if (!cleanWord) return new Set()

    let current = this.root
    for (let i = 0; i < cleanWord.length; i++) {
      const char = cleanWord[i]
      const nextNode = current.children.get(char)
      if (!nextNode) {
        return new Set()
      }
      current = nextNode
    }

    return current.isEndOfWord ? new Set(current.exactProductIds) : new Set()
  }

  /**
   * Retrieves the entire vocabulary (all distinct indexed words) in the Trie.
   * Useful for dictionary-based fuzzy matching.
   */
  public getVocabulary(): string[] {
    return Array.from(this.vocabulary)
  }

  /**
   * Returns the total number of distinct words in the Trie index.
   */
  public get size(): number {
    return this.vocabulary.size
  }
}
