/**
 * Fuzzy Search & Edit Distance Matching
 * 
 * Provides typo-tolerant matching using Damerau-Levenshtein distance
 * with adaptive thresholds and vocabulary pruning for optimal performance.
 */

/**
 * Computes the Damerau-Levenshtein distance between two strings.
 * Accounts for:
 * - Insertions
 * - Deletions
 * - Substitutions
 * - Transpositions of adjacent characters (e.g. "teh" -> "the", "iphnoe" -> "iphone")
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length

  if (aLen === 0) return bLen
  if (bLen === 0) return aLen
  if (a === b) return 0

  // 2D distance matrix
  const matrix: number[][] = []

  for (let i = 0; i <= aLen; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= bLen; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= aLen; i++) {
    const aChar = a[i - 1]
    for (let j = 1; j <= bLen; j++) {
      const bChar = b[j - 1]
      const cost = aChar === bChar ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      )

      // Transposition
      if (
        i > 1 &&
        j > 1 &&
        aChar === b[j - 2] &&
        a[i - 2] === bChar
      ) {
        matrix[i][j] = Math.min(
          matrix[i][j],
          matrix[i - 2][j - 2] + cost
        )
      }
    }
  }

  return matrix[aLen][bLen]
}

/**
 * Returns the maximum allowed edit distance based on query length.
 * - < 3 chars: 0 (Strict - avoid noisy fuzzy matches on 1-2 char queries)
 * - 3 to 5 chars: 1 edit (e.g. "iphon" -> "iphone", "sho" -> "shoe")
 * - >= 6 chars: 2 edits (e.g. "samsng" -> "samsung", "macbok" -> "macbook")
 */
export function getMaxAllowedDistance(queryLength: number): number {
  if (queryLength < 3) return 0
  if (queryLength <= 5) return 1
  return 2
}

/**
 * Calculates a similarity score between 0.0 (completely dissimilar) and 1.0 (exact match).
 */
export function calculateSimilarity(a: string, b: string, distance?: number): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0
  const dist = distance !== undefined ? distance : damerauLevenshteinDistance(a, b)
  return Math.max(0, (maxLen - dist) / maxLen)
}

export interface FuzzyMatchResult {
  word: string
  distance: number
  similarity: number
}

/**
 * Scans a vocabulary list and finds words that match the query token within allowed edit distance.
 * Returns matches ordered by closest distance and highest similarity.
 */
export function findFuzzyMatches(
  queryToken: string,
  vocabulary: string[],
  maxAllowedDistance?: number,
  limit: number = 8
): FuzzyMatchResult[] {
  if (!queryToken || vocabulary.length === 0) return []

  const allowedDist = maxAllowedDistance !== undefined
    ? maxAllowedDistance
    : getMaxAllowedDistance(queryToken.length)

  if (allowedDist <= 0) return []

  const results: FuzzyMatchResult[] = []

  for (let i = 0; i < vocabulary.length; i++) {
    const candidate = vocabulary[i]

    // Fast length check filter
    if (Math.abs(candidate.length - queryToken.length) > allowedDist) {
      continue
    }

    // Fast prefix check: if query is at least 3 chars and first letters don't match,
    // only compute distance if candidate is reasonably sized
    const distance = damerauLevenshteinDistance(queryToken, candidate)
    if (distance <= allowedDist) {
      const similarity = calculateSimilarity(queryToken, candidate, distance)
      results.push({
        word: candidate,
        distance,
        similarity,
      })
    }
  }

  // Sort by lowest distance first, then highest similarity, then shorter length
  results.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance
    if (b.similarity !== a.similarity) return b.similarity - a.similarity
    return a.word.length - b.word.length
  })

  return results.slice(0, limit)
}
