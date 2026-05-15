# Implementation Plan: Global Search

## Overview

Implement a platform-wide Google/web search system for TabTrack. The backend proxies queries to the Google Custom Search API via a new Express route. The frontend adds a React Context provider, a floating overlay (React Portal, `z-[200]`), an in-platform iframe preview modal (`z-[300]`), a dedicated `/search` page, and a Navbar trigger button — all without touching Room.jsx, WebRTC, Socket.IO, or Monaco state.

The implementation language is **JavaScript (JSX for React components)**.

---

## Tasks

- [ ] 1. Install testing dependencies and set up test infrastructure
  - Install `fast-check` in the Frontend: `npm install --save-dev fast-check`
  - Install `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event` in the Frontend: `npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`
  - Install `fast-check` and `jest` (with `@jest/globals`) in the Backend: `npm install --save-dev fast-check jest`
  - Add `"test": "vitest --run"` script to `Frontend/package.json`
  - Add `"test": "jest --testPathPattern=src"` script to `Backend/package.json`
  - Create `Frontend/vitest.config.js` configuring jsdom environment and `@testing-library/jest-dom` setup file
  - Create `Frontend/src/test-setup.js` importing `@testing-library/jest-dom`
  - Create `Backend/jest.config.js` with `testEnvironment: "node"` and `transform: {}` (CommonJS)
  - _Requirements: 1.1–1.14, 2.1–2.5, 3.1–3.7, 4.1–4.15, 5.1–5.5, 6.1–6.7, 7.1–7.6, 8.1–8.6, 9.1–9.6, 10.1–10.4, 11.1–11.4_

- [ ] 2. Backend — search controller and route
  - [ ] 2.1 Create `Backend/src/controllers/searchController.js`
    - Validate `q` param: if absent or empty after `.trim()`, respond `400 { results: [], error: "Query parameter 'q' is required and must be non-empty." }`
    - Define the filter map object mapping each filter key to its site restriction string (see design filter table)
    - If `filter` is provided and not a key in the filter map, respond `400 { results: [], error: "Invalid filter value." }`
    - Build the Google CSE URL using `process.env.GOOGLE_SEARCH_API_KEY` and `process.env.GOOGLE_SEARCH_ENGINE_ID`; append the site restriction to the query when filter is not `all`
    - Make the HTTPS request using Node's built-in `https` module (no new npm packages)
    - Map each CSE item to `{ title, snippet, link, displayLink, thumbnail, favicon }` per the design field-mapping table
    - On success respond `200 { results: [...], error: null }`
    - On Google CSE non-2xx respond `502 { results: [], error: "Search service returned an error: <status>." }`
    - On network error/timeout respond `502 { results: [], error: "Search service is unreachable." }`
    - Never include `GOOGLE_SEARCH_API_KEY` or `GOOGLE_SEARCH_ENGINE_ID` values in any response body or error message
    - _Requirements: 1.1–1.13_

  - [ ]* 2.2 Write property tests for searchController (Properties 1, 2, 3)
    - Create `Backend/src/__tests__/searchController.property.test.js`
    - Mock the `https` module to avoid real network calls
    - **Property 1: Filter map produces correct site restriction** — `fc.constantFrom("all","docs","youtube","stackoverflow","geeksforgeeks","mdn","research")` → outgoing URL contains exactly the expected site restriction string and no other `site:` restriction
    - **Property 2: Response shape completeness** — `fc.array(fc.record({title:fc.string(),snippet:fc.string(),link:fc.webUrl(),displayLink:fc.string(),pagemap:fc.constant({})}), {minLength:1})` → every mapped result has non-null `title`, `snippet`, `link`, `displayLink`, `favicon` and a string-or-null `thumbnail`
    - **Property 3: API credentials never leak** — `fc.record({q:fc.string({minLength:1}),filter:fc.constantFrom("all","docs","youtube")})` → response body string does not contain `process.env.GOOGLE_SEARCH_API_KEY` or `process.env.GOOGLE_SEARCH_ENGINE_ID`
    - Tag each test: `// Feature: global-search, Property <N>: <property_text>`
    - _Requirements: 1.3–1.11_

  - [ ] 2.3 Create `Backend/src/routes/search.js`
    - Import Express Router and `searchController`
    - Register `router.get("/", searchController.search)`
    - Export the router
    - _Requirements: 1.1, 1.14_

  - [ ] 2.4 Mount search route in `Backend/src/app.js`
    - Add `const searchRouter = require("./routes/search");`
    - Add `app.use("/api/search", searchRouter);` after the existing `app.use("/room", roomRouter)` line
    - _Requirements: 1.14_

  - [ ] 2.5 Add environment variable placeholders to `Backend/.env`
    - Append `GOOGLE_SEARCH_API_KEY=` and `GOOGLE_SEARCH_ENGINE_ID=` as placeholder lines (empty values) so developers know to fill them in
    - _Requirements: 1.2, 1.3_

- [ ] 3. Checkpoint — Backend smoke test
  - Ensure all backend tests pass, ask the user if questions arise.

- [ ] 4. Frontend — SearchContext (GlobalSearchProvider + useSearch)
  - [ ] 4.1 Create `Frontend/src/context/SearchContext.jsx`
    - Define the full state shape: `isOpen`, `query`, `results`, `loading`, `error`, `activeFilter` (default `"all"`), `selectedIndex` (default `-1`), `previewUrl`, `recentSearches` (loaded from `localStorage` key `tabtrack_recent_searches`), `focusWarningDismissed`
    - Implement `openSearch`, `closeSearch` (resets `results`, `loading`, `error`, `selectedIndex`, `previewUrl` to initial values; preserves `recentSearches` and `activeFilter`), `search`, `setQuery`, `setFilter`, `openPreview`, `closePreview`, `clearRecent`, `removeRecent`
    - `search(query, filter)`: call `GET /api/search?q=<query>&filter=<filter>` via axios; set `loading` before call; on success set `results` and save query to `recentSearches` (max 10, case-insensitive dedup, duplicate moves to front); on error set `error`; always set `loading = false`
    - `recentSearches` persistence: read from `localStorage` on init; write to `localStorage` on every mutation (add, remove, clear)
    - Register exactly one `keydown` listener on `document` in a `useEffect` with cleanup; implement all keyboard shortcuts per the design spec (Ctrl+G/K guard, Escape, ArrowDown, ArrowUp, Enter)
    - Export `GlobalSearchProvider` component and `useSearch` hook
    - _Requirements: 2.1–2.5, 3.1–3.7, 6.1–6.7_

  - [ ]* 4.2 Write property tests for SearchContext logic (Properties 4, 5, 6, 8, 9, 10, 13, 14)
    - Create `Frontend/src/__tests__/SearchContext.property.test.jsx`
    - Use `@testing-library/react` to render `GlobalSearchProvider` with a consumer component
    - **Property 4: closeSearch resets transient state** — `fc.record({results:fc.array(fc.record({title:fc.string(),link:fc.webUrl(),snippet:fc.string(),displayLink:fc.string(),favicon:fc.string(),thumbnail:fc.option(fc.string())})),loading:fc.boolean(),error:fc.option(fc.string()),selectedIndex:fc.integer(),previewUrl:fc.option(fc.webUrl()),recentSearches:fc.array(fc.string()),activeFilter:fc.constantFrom("all","docs","youtube")})` → after `closeSearch()`, `results===[]`, `loading===false`, `error===null`, `selectedIndex===-1`, `previewUrl===null`, `recentSearches` and `activeFilter` unchanged
    - **Property 5: Keyboard guard** — `fc.constantFrom("INPUT","TEXTAREA")` and `fc.constant("[data-keybinding-context]")` → Ctrl+G/K on those elements does NOT set `isOpen` to `true`
    - **Property 6: Arrow key navigation wraps** — `fc.integer({min:1,max:50})` for N, `fc.integer({min:0})` for startIndex → ArrowDown produces `(idx+1)%N`, ArrowUp produces `(idx-1+N)%N`
    - **Property 8: recentSearches never exceeds 10** — `fc.array(fc.string({minLength:1}),{minLength:11,maxLength:30})` → after processing all queries, `recentSearches.length <= 10`
    - **Property 9: Deduplication case-insensitive** — `fc.string({minLength:1})` repeated with different casing → appears exactly once at index 0
    - **Property 10: localStorage round-trip** — `fc.array(fc.string())` → `JSON.parse(JSON.stringify(arr))` is element-wise equal to original
    - **Property 13: Results count preserved** — `fc.integer({min:0,max:50})` for N → mock API returning N items → `state.results.length === N`
    - **Property 14: Result links never mutated** — `fc.array(fc.record({link:fc.webUrl(),title:fc.string(),snippet:fc.string(),displayLink:fc.string(),favicon:fc.string(),thumbnail:fc.option(fc.string())}))` → `state.results[i].link === apiResponse.results[i].link` for all i
    - Tag each test: `// Feature: global-search, Property <N>: <property_text>`
    - _Requirements: 2.5, 3.1–3.7, 6.2, 6.3, 11.1–11.4_

- [ ] 5. Frontend — SearchInput component
  - [ ] 5.1 Create `Frontend/src/Components/search/SearchInput.jsx`
    - Render an `<input>` with `h-14`, search icon on the left, and a clear (×) button on the right when `query` is non-empty
    - Use `autoFocus` prop so the input receives focus when the overlay opens
    - Debounce the `onChange` handler by 300ms before calling `search(value, activeFilter)` from `useSearch()`
    - Call `setQuery(value)` immediately on every keystroke (for controlled input display)
    - _Requirements: 4.7_

- [ ] 6. Frontend — SearchFilters component
  - [ ] 6.1 Create `Frontend/src/Components/search/SearchFilters.jsx`
    - Render filter pills for: All, Docs, YouTube, Stack Overflow, GeeksforGeeks, MDN, Research
    - Map display labels to filter values: `all`, `docs`, `youtube`, `stackoverflow`, `geeksforgeeks`, `mdn`, `research`
    - Active pill style: `bg-primary/20 border-primary/50 text-primary`
    - On click: call `setFilter(value)` from `useSearch()`
    - _Requirements: 4.8, 4.9_

- [ ] 7. Frontend — SearchResultCard component
  - [ ] 7.1 Create `Frontend/src/Components/search/SearchResultCard.jsx`
    - Accept props: `result` (SearchResult object), `isSelected` (boolean), `onOpen` (function)
    - Layout: 32×32 favicon image (with `onError` fallback to a generic globe icon SVG) | title + displayLink + snippet | optional thumbnail on the right when `result.thumbnail` is non-null
    - Selected state: apply `bg-white/10 ring-1 ring-primary/50`
    - On click: call `onOpen(result.link)`
    - _Requirements: 5.1–5.5_

  - [ ]* 7.2 Write property test for SearchResultCard (Property 7)
    - Create `Frontend/src/__tests__/SearchResultCard.property.test.jsx`
    - **Property 7: Result card renders all required fields** — `fc.record({title:fc.string({minLength:1}),snippet:fc.string({minLength:1}),displayLink:fc.string({minLength:1}),favicon:fc.webUrl(),link:fc.webUrl(),thumbnail:fc.option(fc.webUrl())})` → rendered card contains `title`, `displayLink`, `snippet` text and an `<img>` element for the favicon
    - Tag: `// Feature: global-search, Property 7: Result card renders all required fields`
    - _Requirements: 5.1, 5.2_

- [ ] 8. Frontend — SearchResultsList component
  - [ ] 8.1 Create `Frontend/src/Components/search/SearchResultsList.jsx`
    - Render `overflow-y-auto max-h-[55vh]` container
    - Loading state: render 5 animated `Skeleton_Card` placeholder divs (pulsing `bg-white/5 rounded-xl h-16`)
    - Empty state (no error, `results.length === 0`, query non-empty): render "No results found for …" message
    - Error state (`error !== null`): render error message with the `error` string
    - Results state: map `results` to `<SearchResultCard>` passing `isSelected={index === selectedIndex}` and `onOpen={openPreview}`
    - _Requirements: 4.10–4.13_

- [ ] 9. Frontend — RecentSearches component
  - [ ] 9.1 Create `Frontend/src/Components/search/RecentSearches.jsx`
    - Show only when `query === ""` and `recentSearches.length > 0`
    - Render a "Recent" heading with a "Clear all" button (calls `clearRecent()`) at top-right
    - Each entry: clock icon + entry text + ✕ button (calls `removeRecent(entry)`)
    - Clicking an entry: calls `setQuery(entry)` then `search(entry, activeFilter)`
    - _Requirements: 6.4–6.7_

- [ ] 10. Frontend — FocusModeWarning component
  - [ ] 10.1 Create `Frontend/src/Components/search/FocusModeWarning.jsx`
    - Accept props: `query` (string), `results` (array), `dismissed` (boolean), `onDismiss` (function)
    - Define the study-related keywords array from Requirement 10.1
    - Show the yellow banner only when: current `window.location.pathname` contains `/room/` AND query does not contain any study keyword (case-insensitive) AND `results.length > 0` AND `dismissed === false`
    - Render a non-blocking yellow banner with a dismiss (×) button that calls `onDismiss()`
    - _Requirements: 10.1–10.4_

  - [ ]* 10.2 Write property test for FocusModeWarning (Property 12)
    - Create `Frontend/src/__tests__/FocusModeWarning.property.test.jsx`
    - **Property 12: Focus warning shown iff query is off-topic in a room** — `fc.string()` for query → when pathname contains `/room/` and results present: banner visible iff query contains no study keyword; when query contains at least one study keyword: banner NOT visible regardless of pathname
    - Tag: `// Feature: global-search, Property 12: Focus mode warning shown iff query is off-topic in a room`
    - _Requirements: 10.1_

- [ ] 11. Frontend — GlobalSearchOverlay component
  - [ ] 11.1 Create `Frontend/src/Components/search/GlobalSearchOverlay.jsx`
    - Render via `ReactDOM.createPortal(…, document.body)`
    - Return `null` when `isOpen === false`
    - Backdrop: `fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]`; clicking backdrop calls `closeSearch()`
    - Panel: `fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-[680px] glass backdrop-blur-2xl rounded-2xl border border-white/10 shadow-glass`
    - Animation: CSS transition `scale` + `opacity`, `duration-150 ease` (use `data-state` or conditional class toggling)
    - Compose child components in order: `<SearchInput />`, `<SearchFilters />`, `<RecentSearches />`, `<FocusModeWarning />`, `<SearchResultsList />`
    - Footer: `↑↓ navigate  ↵ open  Esc close` hint text
    - z-index: `z-[200]`
    - _Requirements: 4.1–4.15_

- [ ] 12. Frontend — SearchPreviewModal component
  - [ ] 12.1 Create `Frontend/src/Components/search/SearchPreviewModal.jsx`
    - Render via `ReactDOM.createPortal(…, document.body)`
    - Return `null` when `previewUrl === null`
    - Outer: `fixed inset-0 z-[300] flex flex-col bg-[hsl(222,47%,6%)]`
    - Header bar: back button (calls `closePreview()`), read-only URL bar showing `previewUrl`, "Open in new tab" button (`window.open(previewUrl, "_blank")`), close button (calls `closePreview()`)
    - Body: `<iframe src={previewUrl} className="w-full flex-1 border-0" />`
    - X-Frame-Options fallback: attach `onLoad` handler; if `iframe.contentDocument` is inaccessible (cross-origin block), replace iframe with fallback message "This site can't be previewed. Open in new tab?" and a button that opens the URL in a new tab
    - _Requirements: 7.1–7.6_

- [ ] 13. Frontend — SearchPage component
  - [ ] 13.1 Create `Frontend/src/Components/search/SearchPage.jsx`
    - Use `useSearchParams()` from react-router-dom to read `q` and `filter` on mount
    - `useEffect([searchParams])`: if `q` is present, call `search(q, filter || "all")`
    - On new search triggered from this page: call `setSearchParams({ q, filter: activeFilter })` to keep URL bookmarkable
    - Layout: `grid grid-cols-1 md:grid-cols-2 gap-4` for results
    - Render `<SearchFilters />`, loading state (skeleton cards), empty state, error state, and `<SearchResultCard>` list — same states as the overlay
    - _Requirements: 8.1–8.6_

  - [ ]* 13.2 Write property test for SearchPage URL sync (Property 11)
    - Create `Frontend/src/__tests__/SearchPage.property.test.jsx`
    - Use `MemoryRouter` with `initialEntries` and mock `useSearch`
    - **Property 11: Search page URL round-trip** — `fc.tuple(fc.string({minLength:1}), fc.constantFrom("all","docs","youtube","stackoverflow","geeksforgeeks","mdn","research"))` → after executing a search, `searchParams.get("q") === q` and `searchParams.get("filter") === f`
    - Tag: `// Feature: global-search, Property 11: Search page URL round-trip`
    - _Requirements: 8.4_

- [ ] 14. Checkpoint — Frontend context and core components
  - Ensure all frontend tests pass, ask the user if questions arise.

- [ ] 15. Frontend — Modify Navbar.jsx
  - [ ] 15.1 Modify `Frontend/src/Components/Navbar.jsx`
    - Import `useSearch` from `../context/SearchContext` and a `Search` icon (use an inline SVG or lucide-react if available, otherwise a simple magnifying-glass SVG)
    - Replace the `<div className="hidden md:block w-[220px]"><Input placeholder="Search…" /></div>` block with the trigger button from the design spec (same `w-[220px]`, glass border, `Ctrl+G` badge)
    - Wire the button's `onClick` to `openSearch` from `useSearch()`
    - Add a "Search" `<button>` entry to the dropdown menu (before the logout section) that calls `openSearch()` and `setOpen(false)`
    - Remove the now-unused `Input` import if it is no longer used elsewhere in the file
    - _Requirements: 9.1–9.6_

- [ ] 16. Frontend — Modify App.jsx (wire everything together)
  - [ ] 16.1 Modify `Frontend/src/App.jsx`
    - Import `GlobalSearchProvider` from `./context/SearchContext`
    - Import `GlobalSearchOverlay` from `./Components/search/GlobalSearchOverlay`
    - Import `SearchPreviewModal` from `./Components/search/SearchPreviewModal`
    - Import `SearchPage` from `./Components/search/SearchPage`
    - Wrap the entire return with `<GlobalSearchProvider>` as the outermost element (outside `<Provider store={appStore}>`)
    - Add `<Route path="search" element={<SearchPage />} />` inside the `<Route path="/" element={<Body/>}>` block
    - Mount `<GlobalSearchOverlay />` and `<SearchPreviewModal />` inside `<GlobalSearchProvider>` but outside `<BrowserRouter>` (they use portals so DOM position doesn't matter, but they need context access)
    - _Requirements: 2.1, 4.1, 4.2, 8.1_

- [ ] 17. Final checkpoint — Full integration
  - Ensure all tests pass (backend and frontend), ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Backend property tests mock the `https` module to avoid real network calls
- Frontend property tests use `@testing-library/react` with a mock `SearchContext` value where needed
- The `GlobalSearchOverlay` and `SearchPreviewModal` use React Portals — they render into `document.body` regardless of where they appear in the JSX tree, so they never interfere with Room.jsx, WebRTC, or Monaco state
- `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` must be filled in `Backend/.env` before the search feature will return real results

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.2", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1"] },
    { "id": 3, "tasks": ["2.4", "2.5", "7.2", "10.2", "11.1", "12.1", "13.1"] },
    { "id": 4, "tasks": ["13.2", "15.1"] },
    { "id": 5, "tasks": ["16.1"] }
  ]
}
```
