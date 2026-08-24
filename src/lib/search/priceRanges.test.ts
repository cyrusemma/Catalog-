/**
 * Automated test suite for Price Ranges logic
 * 
 * Verifies:
 * 1. Price range matching with effective/sale price
 * 2. Multi-range selection (union matching)
 * 3. Open-ended ranges (null max_price)
 * 4. Overlap detection
 */

import type { PriceRange, Product } from '../../types'
import { effectivePrice } from '../utils'

function matchProductToPriceRanges(product: Product, selectedRanges: PriceRange[]): boolean {
  if (!selectedRanges || selectedRanges.length === 0) return true
  const price = effectivePrice(product)
  return selectedRanges.some(r => {
    const matchesMin = price >= r.min_price
    const matchesMax = r.max_price === null || price <= r.max_price
    return matchesMin && matchesMax
  })
}

function detectOverlaps(ranges: PriceRange[]): { a: string; b: string }[] {
  const active = ranges.filter(r => r.is_active)
  const overlaps: { a: string; b: string }[] = []

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]
      const b = active[j]

      const aMin = a.min_price
      const aMax = a.max_price ?? Infinity
      const bMin = b.min_price
      const bMax = b.max_price ?? Infinity

      const overlapStart = Math.max(aMin, bMin)
      const overlapEnd = Math.min(aMax, bMax)

      if (overlapStart < overlapEnd && !(aMax === bMin || bMax === aMin)) {
        overlaps.push({ a: a.name, b: b.name })
      }
    }
  }
  return overlaps
}

function runTests() {
  console.log('=== Running Price Range Logic Tests ===')

  const testRanges: PriceRange[] = [
    { id: '1', name: 'Budget', min_price: 0, max_price: 50, label: 'Under GH₵50', sort_order: 1, is_active: true },
    { id: '2', name: 'Mid', min_price: 50, max_price: 100, label: 'GH₵50 – GH₵100', sort_order: 2, is_active: true },
    { id: '3', name: 'Premium', min_price: 500, max_price: null, label: 'GH₵500+', sort_order: 3, is_active: true },
  ]

  const mockProduct = (id: string, price: number, flashPrice?: number): Product => ({
    id,
    title: `Product ${id}`,
    slug: `product-${id}`,
    selling_price: price,
    flash_sale_price: flashPrice ?? null,
    flash_sale_ends_at: flashPrice ? new Date(Date.now() + 100000).toISOString() : null,
    is_published: true,
    created_at: new Date().toISOString(),
  } as Product)

  const p25 = mockProduct('p25', 25)
  const p75 = mockProduct('p75', 75)
  const p300 = mockProduct('p300', 300)
  const p600 = mockProduct('p600', 600)
  const pDiscounted = mockProduct('pDisc', 550, 45) // Selling price 550, but flash sale 45 -> matches Budget!

  // 1. Single Range Match
  console.log('\n[1] Single Range Matches')
  const budgetRange = [testRanges[0]]
  if (!matchProductToPriceRanges(p25, budgetRange)) throw new Error('p25 should match Budget')
  if (matchProductToPriceRanges(p75, budgetRange)) throw new Error('p75 should NOT match Budget')
  console.log('✓ Budget range correctly filters p25 vs p75')

  // 2. Open-Ended Range Match
  console.log('\n[2] Open-Ended Range Match (GH₵500+)')
  const premiumRange = [testRanges[2]]
  if (!matchProductToPriceRanges(p600, premiumRange)) throw new Error('p600 should match Premium')
  if (matchProductToPriceRanges(p300, premiumRange)) throw new Error('p300 should NOT match Premium')
  console.log('✓ Premium open-ended range correctly matches p600')

  // 3. Discounted / Flash Sale Price
  console.log('\n[3] Discounted Product Effective Price Match')
  if (!matchProductToPriceRanges(pDiscounted, budgetRange)) {
    throw new Error('pDiscounted (effective price 45) should match Budget range')
  }
  console.log('✓ Discounted product with original 550 and sale price 45 matches Budget (< 50)')

  // 4. Multi-Select Range Match
  console.log('\n[4] Multiple Selected Ranges')
  const multiRanges = [testRanges[0], testRanges[2]] // Budget (<50) OR Premium (500+)
  if (!matchProductToPriceRanges(p25, multiRanges)) throw new Error('p25 should match Budget or Premium')
  if (!matchProductToPriceRanges(p600, multiRanges)) throw new Error('p600 should match Budget or Premium')
  if (matchProductToPriceRanges(p75, multiRanges)) throw new Error('p75 should NOT match Budget or Premium')
  console.log('✓ Multi-select [Budget, Premium] matches p25 and p600, excludes p75')

  // 5. Overlap Detection
  console.log('\n[5] Overlap Detection')
  const nonOverlapping = testRanges
  const overlaps1 = detectOverlaps(nonOverlapping)
  if (overlaps1.length !== 0) throw new Error('Standard ranges touching at boundary 50 should not trigger overlap')
  console.log('✓ Touching boundary ranges (0-50, 50-100) are not marked as overlapping')

  const overlappingList: PriceRange[] = [
    { id: '1', name: 'Bracket A', min_price: 0, max_price: 100, label: '0-100', sort_order: 1, is_active: true },
    { id: '2', name: 'Bracket B', min_price: 50, max_price: 200, label: '50-200', sort_order: 2, is_active: true },
  ]
  const overlaps2 = detectOverlaps(overlappingList)
  if (overlaps2.length !== 1) throw new Error('Bracket A (0-100) and Bracket B (50-200) should trigger overlap')
  console.log(`✓ Overlap detected correctly: "${overlaps2[0].a}" with "${overlaps2[0].b}"`)

  console.log('\nAll Price Range Tests Passed Successfully! 🎉')
}

runTests()
