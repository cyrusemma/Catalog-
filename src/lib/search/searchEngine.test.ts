import { Trie, normalizeSearchText, tokenizeText } from './trie'
import { damerauLevenshteinDistance, findFuzzyMatches } from './fuzzy'
import { ProductSearchEngine } from './searchEngine'
import type { Product } from '../../types'

function createMockProduct(id: string, title: string, brand?: string, category = 'Electronics', description = ''): Product {
  return {
    id,
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    brand,
    category,
    category_id: 'cat-1',
    description,
    selling_price: 999,
    images: ['https://example.com/img.jpg'],
    stock: 10,
    stock_status: 'in_stock',
    delivery_fee: 0,
    sizes: [],
    colors: [],
    is_featured: false,
    is_published: true,
    created_at: new Date().toISOString(),
  }
}

function runTests() {
  console.log('--- Starting Search Engine Tests ---')

  // 1. Test Text Normalization & Tokenization
  console.log('\n[1] Testing Normalization & Tokenization')
  const rawText = '   Apple iPhone 15 Pro Max, 256GB!   '
  const normalized = normalizeSearchText(rawText)
  const tokens = tokenizeText(rawText)
  console.log('Normalized:', normalized)
  console.log('Tokens:', tokens)
  if (!tokens.includes('apple') || !tokens.includes('iphone') || !tokens.includes('15') || !tokens.includes('pro')) {
    throw new Error('Tokenization failed!')
  }
  console.log('✓ Normalization & Tokenization passed.')

  // 2. Test Trie Prefix Search
  console.log('\n[2] Testing Trie Prefix Search')
  const trie = new Trie()
  trie.insert('iphone 14', 'p-14')
  trie.insert('iphone 15', 'p-15')
  trie.insert('iphone 15 pro', 'p-15-pro')
  trie.insert('iphone 16', 'p-16')
  trie.insert('samsung galaxy', 'p-sam')

  const iphResults = Array.from(trie.searchPrefix('iph'))
  console.log('Search prefix "iph":', iphResults)
  if (iphResults.length !== 4 || iphResults.includes('p-sam')) {
    throw new Error('Trie prefix search failed for "iph"!')
  }

  const samResults = Array.from(trie.searchPrefix('sam'))
  console.log('Search prefix "sam":', samResults)
  if (samResults.length !== 1 || !samResults.includes('p-sam')) {
    throw new Error('Trie prefix search failed for "sam"!')
  }
  console.log('✓ Trie Prefix Search passed.')

  // 3. Test Damerau-Levenshtein Fuzzy Matching
  console.log('\n[3] Testing Damerau-Levenshtein Fuzzy Matching')
  const d1 = damerauLevenshteinDistance('iphone', 'iphon') // deletion (dist 1)
  const d2 = damerauLevenshteinDistance('samsung', 'samsng') // deletion (dist 1)
  const d3 = damerauLevenshteinDistance('macbook', 'macbok') // deletion (dist 1)
  const d4 = damerauLevenshteinDistance('phone', 'teh') // dissimilar
  const d5 = damerauLevenshteinDistance('iphone', 'iphnoe') // transposition (dist 1)

  console.log('Dist("iphone", "iphon"):', d1)
  console.log('Dist("samsung", "samsng"):', d2)
  console.log('Dist("macbook", "macbok"):', d3)
  console.log('Dist("phone", "teh"):', d4)
  console.log('Dist("iphone", "iphnoe") (transposition):', d5)

  if (d1 !== 1 || d2 !== 1 || d5 !== 1) {
    throw new Error('Damerau-Levenshtein calculation failed!')
  }

  const vocab = ['iphone', 'samsung', 'macbook', 'headphones', 'camera']
  const fuzzyIphon = findFuzzyMatches('iphon', vocab)
  console.log('Fuzzy matches for "iphon":', fuzzyIphon)
  if (fuzzyIphon.length === 0 || fuzzyIphon[0].word !== 'iphone') {
    throw new Error('Fuzzy matching failed for "iphon"!')
  }

  const fuzzySamsng = findFuzzyMatches('samsng', vocab)
  console.log('Fuzzy matches for "samsng":', fuzzySamsng)
  if (fuzzySamsng.length === 0 || fuzzySamsng[0].word !== 'samsung') {
    throw new Error('Fuzzy matching failed for "samsng"!')
  }
  console.log('✓ Fuzzy matching passed.')

  // 4. Test ProductSearchEngine Ranking
  console.log('\n[4] Testing ProductSearchEngine Multi-Field & Ranking')
  const products: Product[] = [
    createMockProduct('1', 'Apple iPhone 15 Pro', 'Apple', 'Smartphones', 'Flagship smartphone with titanium design'),
    createMockProduct('2', 'Apple iPhone 14', 'Apple', 'Smartphones', 'Reliable Apple smartphone'),
    createMockProduct('3', 'Samsung Galaxy S24 Ultra', 'Samsung', 'Smartphones', 'Top Samsung phone with AI'),
    createMockProduct('4', 'iPhone Case Silicon', 'Spigen', 'Accessories', 'Protective case for iPhone devices'),
    createMockProduct('5', 'Leather Wallet', 'Bellroy', 'Accessories', 'Premium leather wallet for cards and cash'),
  ]

  const engine = new ProductSearchEngine(products)

  // 4a. Exact / Prefix Search
  console.log('\nTesting query "iPhone 15 Pro":')
  const resultsExact = engine.searchWithScores('iPhone 15 Pro')
  console.log('Results:', resultsExact.map(r => `${r.product.title} (Tier ${r.matchTier}, Score ${r.score})`))
  if (resultsExact[0]?.product.id !== '1') {
    throw new Error('Exact product did not rank first!')
  }

  // 4b. Prefix Search "iph"
  console.log('\nTesting query "iph":')
  const resultsPrefix = engine.searchWithScores('iph')
  console.log('Results:', resultsPrefix.map(r => `${r.product.title} (Tier ${r.matchTier}, Score ${r.score})`))
  if (!resultsPrefix.some(r => r.product.id === '1') || !resultsPrefix.some(r => r.product.id === '2')) {
    throw new Error('Prefix candidates missing!')
  }

  // 4c. Typo / Fuzzy Search "samsng"
  console.log('\nTesting typo query "samsng":')
  const resultsTypo = engine.searchWithScores('samsng')
  console.log('Results:', resultsTypo.map(r => `${r.product.title} (Tier ${r.matchTier}, Score ${r.score}, Fuzzy: ${r.isFuzzy})`))
  if (resultsTypo.length === 0 || resultsTypo[0]?.product.id !== '3') {
    throw new Error('Fuzzy typo matching failed for "samsng"!')
  }

  // 4d. Brand search "Apple"
  console.log('\nTesting brand query "Apple":')
  const resultsBrand = engine.searchWithScores('Apple')
  console.log('Results:', resultsBrand.map(r => `${r.product.title} (Tier ${r.matchTier}, Score ${r.score})`))
  if (!resultsBrand.some(r => r.product.id === '1') || !resultsBrand.some(r => r.product.id === '2')) {
    throw new Error('Brand search failed!')
  }

  // 4e. Category search "Accessories"
  console.log('\nTesting category query "Accessories":')
  const resultsCat = engine.searchWithScores('Accessories')
  console.log('Results:', resultsCat.map(r => `${r.product.title} (Tier ${r.matchTier}, Score ${r.score})`))
  if (!resultsCat.some(r => r.product.id === '4') || !resultsCat.some(r => r.product.id === '5')) {
    throw new Error('Category search failed!')
  }

  // 5. Suggestions
  console.log('\n[5] Testing Suggestions')
  const suggestions = engine.getSuggestions('iph')
  console.log('Suggestions for "iph":', suggestions)
  if (suggestions.length === 0) {
    throw new Error('Suggestions generation failed!')
  }

  // 6. Performance Benchmarking with 1000 simulated products
  console.log('\n[6] Performance Benchmarking with 1,000 Products')
  const largeProductSet: Product[] = []
  const brands = ['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'Puma', 'LG', 'Google', 'Dell', 'Asus']
  const categoriesList = ['Smartphones', 'Laptops', 'Audio', 'Footwear', 'Apparel', 'Accessories']

  for (let i = 0; i < 1000; i++) {
    const b = brands[i % brands.length]
    const c = categoriesList[i % categoriesList.length]
    largeProductSet.push(
      createMockProduct(
        `p-${i}`,
        `${b} Product Model ${i} Pro Plus`,
        b,
        c,
        `High performance ${b} item in ${c} category with great features number ${i}`
      )
    )
  }

  const startBuild = performance.now()
  const largeEngine = new ProductSearchEngine(largeProductSet)
  const buildTime = performance.now() - startBuild
  console.log(`Indexed 1,000 products in: ${buildTime.toFixed(2)}ms`)

  const startQuery1 = performance.now()
  const search1 = largeEngine.searchWithScores('Apple Model 10')
  const queryTime1 = performance.now() - startQuery1
  console.log(`Prefix search returned ${search1.length} items in: ${queryTime1.toFixed(3)}ms`)

  const startQuery2 = performance.now()
  const search2 = largeEngine.searchWithScores('samsng')
  const queryTime2 = performance.now() - startQuery2
  console.log(`Fuzzy search returned ${search2.length} items in: ${queryTime2.toFixed(3)}ms`)

  if (queryTime1 > 20 || queryTime2 > 50) {
    console.warn('Warning: Search query took longer than expected threshold')
  } else {
    console.log('✓ Performance benchmark passed: sub-millisecond to low millisecond query latency.')
  }

  console.log('\n========================================')
  console.log('ALL SEARCH ENGINE TESTS PASSED SUCCESSFULLY!')
  console.log('========================================')
}

runTests()
