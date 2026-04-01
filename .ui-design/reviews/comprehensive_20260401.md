# Design Review: Firmes Sant Jordi 2026

**Reviewed:** 2026-04-01
**Target:** All UI components
**Focus:** Comprehensive (visual, usability, code, performance)
**Issues Found:** 21

- Critical: 4
- Major: 8
- Minor: 9
- Suggestions: 6

## Critical Issues

### C1. Keyboard navigation broken on FeaturedCards
**File:** `FeaturedCards.tsx:72-74, 93-96` | **Category:** Accessibility
Author photo `<div>` and name `<h3>` have onClick but no role/tabIndex/onKeyDown. SigningCard does this correctly — FeaturedCards does not.

### C2. No visible focus indicators anywhere
**File:** Global, `SearchBar.tsx:24`, `Filters.tsx:54` | **Category:** Accessibility (WCAG 2.4.7)
SearchBar ring is 20% opacity (invisible). All other buttons have no focus ring. WCAG AA failure.

### C3. MapView has no loading or error state
**File:** `MapView.tsx:28-61` | **Category:** Usability
No Suspense, no spinner, no error handling. Blank gray rectangle on slow networks.

### C4. Background gradients scroll on mobile in dark mode
**File:** `index.css:67` | **Category:** Visual
`background-attachment: fixed` only applied at lg: breakpoint. Mobile gets scrolling gradients.

## Major Issues

### M1. SigningCard border-left violates "No-Line Rule"
**File:** `SigningCard.tsx:40` | Design system says no borders for sectioning.

### M2. BottomNav no iOS safe area padding
**File:** `BottomNav.tsx:20` | Overlaps home indicator on modern iPhones.

### M3. SearchBar invisible in favorites, hidden filter persists
**File:** `App.tsx:92-111` | Search text carries over invisibly between views.

### M4. 530KB JSON loaded eagerly at startup
**File:** `App.tsx:4,17` | `authors.json` (407KB) + `signings.json` (124KB) block first paint.

### M5. No list virtualization for 200+ signing cards
**File:** `SigningList.tsx:44-58` | All cards rendered at once, janky on low-end mobile.

### M6. isFavorite callback identity triggers full re-render
**File:** `useFavorites.ts` | Toggling one favorite re-renders entire list.

### M7. Select dropdown focus ring explicitly removed
**File:** `Filters.tsx:54` | `focus:ring-0` kills keyboard visibility.

### M8. AuthorDetail "map" is a fake placeholder
**File:** `AuthorDetail.tsx:216-228` | Static colored div looks like broken map.

## Minor Issues

- m1: Filled icon weight jumps from 200 to 400 (jarring)
- m2: Hero heading hardcoded in Catalan, not i18n
- m3: Footer uses md: breakpoints inside lg:block container (dead CSS)
- m4: No horizontal scroll indicator on mobile FeaturedCards
- m5: Book links fallback to `href="#"` (scrolls to top)
- m6: Timeline dot positioning uses fragile negative offsets
- m7: Bookmark ribbon inline style, not dark-mode aware
- m8: Author photo images lack width/height (CLS)
- m9: Duplicate "Main navigation" aria-label on both navs

## Suggestions

- S1: Skeleton loading states
- S2: Lazy-load MapView (React.lazy + Suspense)
- S3: URL routing for deep linking (essential for sharing on event day)
- S4: Subset Google Fonts (reduce ~50%)
- S5: useDeferredValue for search
- S6: Scroll-to-top affordance

## Positive Observations

- Typography pairing (Newsreader + Manrope) is distinctive and editorial
- Color system is cohesive and meaningful (rose + dragon green)
- Empty states are well-handled with distinct icons/hints
- i18n is clean and complete (CA + ES)
- Custom hooks are well-separated (filters, favorites, dark mode, event day)
- SigningCard a11y baseline is correct (keyboard + role + tabIndex)
- Noise overlay texture is tasteful at 3% opacity
- Dark mode gradients are thoughtfully adjusted, not just inverted

## Prioritized Next Steps

1. Fix a11y: keyboard on FeaturedCards, focus indicators globally, select focus
2. Fix BottomNav iOS safe area
3. Add MapView loading/error state with Suspense
4. Lazy-load MapView + authors.json
5. Remove border-left from SigningCard (use tonal bg shifts)
6. Add list virtualization
7. Fix hardcoded Catalan hero text
8. Replace AuthorDetail placeholder map or redesign as directions card
9. Clear search text on view switch
10. Add URL routing for shareability
