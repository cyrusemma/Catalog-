# TODO - Infinite scroll for Shop

- [ ] Update `src/hooks/useProducts.ts` to support paginated product fetching for infinite scroll (limit + offset/cursor) based on existing filters (categoryIds, search, featured).
- [ ] Implement vertical infinite scroll in `src/pages/Shop.tsx` using `IntersectionObserver` + a sentinel div.
- [ ] Replace the current client-side `visibleCount` Load More button logic with loading additional pages when the sentinel enters view.
- [ ] Preserve existing UX: filters/search/category pills, Back/Forward scroll restoration.
- [ ] Keep current “Netflix-style horizontal rails” behavior when `showRowsView` is active (do not break).
- [ ] Test: verify products append correctly, no duplicates, and filters reset pagination appropriately.

