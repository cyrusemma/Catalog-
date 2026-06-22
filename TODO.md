# TODO - Infinite scroll for Shop

- [x] Update `src/hooks/useProducts.ts` to support paginated product fetching for infinite scroll (limit + offset/cursor) based on existing filters (categoryIds, search, featured).
- [x] Implement vertical infinite scroll in `src/pages/Shop.tsx` using `IntersectionObserver` + a sentinel div.
- [x] Replace the current client-side `visibleCount` Load More button logic with loading additional pages when the sentinel enters view.
- [x] Preserve existing UX: filters/search/category pills, Back/Forward scroll restoration.
- [x] Keep current “Netflix-style horizontal rails” behavior when `showRowsView` is active (do not break).
- [x] Test: verify products append correctly, no duplicates, and filters reset pagination appropriately.

