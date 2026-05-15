# Requirements Document

## Introduction

TabTrack is a student productivity platform that combines collaborative study rooms (WebRTC video, Monaco editor, Socket.IO chat), analytics, and focus tools. This feature adds a platform-wide Google/web search system that lets students search the real web without leaving TabTrack. A floating overlay (triggered by `Ctrl+G` / `Ctrl+K`) proxies queries through the Express backend to the Google Custom Search API, displays results with filter pills, supports in-platform iframe preview, and persists recent searches in localStorage. A dedicated `/search` route provides a shareable, bookmarkable full-page search experience.

## Glossary

- **Search_Overlay**: The floating modal rendered via React Portal that contains the search input, filter pills, results list, and recent searches.
- **Search_Provider**: The `GlobalSearchProvider` React context component that wraps the entire application and owns all search state and the global keyboard listener.
- **Search_API**: The Express route `GET /api/search` that proxies queries to the Google Custom Search API.
- **Google_CSE**: Google Custom Search Engine — the external service called exclusively by the backend using `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`.
- **Preview_Modal**: The full-screen iframe modal (z-[300]) that renders a selected search result inside TabTrack.
- **Search_Page**: The dedicated `/search` route that renders a full-page, two-column search results view.
- **Filter**: A named category (`all`, `docs`, `youtube`, `stackoverflow`, `geeksforgeeks`, `mdn`, `research`) that maps to a Google CSE `siteSearch` query modifier.
- **Recent_Searches**: Up to 10 deduplicated, most-recent-first search strings persisted in `localStorage` under the key `tabtrack_recent_searches`.
- **Focus_Mode_Warning**: A soft, dismissible yellow banner shown inside the Search_Overlay when the user is inside a study room and the query does not contain study-related keywords.
- **Navbar_Trigger**: The styled button in the Navbar that replaces the existing non-functional `<Input placeholder="Search…" />` and opens the Search_Overlay on click.
- **Result_Card**: A single search result item displaying favicon, title, displayLink, snippet, and optional thumbnail.
- **Skeleton_Card**: A placeholder animated card shown in the results list while a search request is in flight.

---

## Requirements

### Requirement 1: Backend Search Proxy

**User Story:** As a student, I want the platform to fetch real Google search results on my behalf, so that my API credentials are never exposed in the browser.

#### Acceptance Criteria

1. THE Search_API SHALL accept a `GET /api/search` request with query parameters `q` (required, non-empty string) and `filter` (optional, defaults to `all`).
2. WHEN a valid request is received, THE Search_API SHALL call Google_CSE using `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` read exclusively from server-side environment variables.
3. THE Search_API SHALL never expose `GOOGLE_SEARCH_API_KEY` or `GOOGLE_SEARCH_ENGINE_ID` in any HTTP response, log output sent to the client, or frontend bundle.
4. WHEN the `filter` parameter is `docs`, THE Search_API SHALL append `site:developer.mozilla.org OR site:docs.python.org` to the Google_CSE query.
5. WHEN the `filter` parameter is `youtube`, THE Search_API SHALL append `site:youtube.com` to the Google_CSE query.
6. WHEN the `filter` parameter is `stackoverflow`, THE Search_API SHALL append `site:stackoverflow.com` to the Google_CSE query.
7. WHEN the `filter` parameter is `geeksforgeeks`, THE Search_API SHALL append `site:geeksforgeeks.org` to the Google_CSE query.
8. WHEN the `filter` parameter is `mdn`, THE Search_API SHALL append `site:developer.mozilla.org` to the Google_CSE query.
9. WHEN the `filter` parameter is `research`, THE Search_API SHALL append `site:arxiv.org OR site:scholar.google.com` to the Google_CSE query.
10. WHEN the `filter` parameter is `all` or omitted, THE Search_API SHALL send the query to Google_CSE without any site restriction.
11. WHEN Google_CSE returns results, THE Search_API SHALL respond with HTTP 200 and a JSON body containing a `results` array where each element has the fields: `title` (string), `snippet` (string), `link` (string), `displayLink` (string), `thumbnail` (string or null), and `favicon` (string).
12. WHEN the `q` parameter is absent or empty, THE Search_API SHALL respond with HTTP 400 and a JSON body containing an `error` field describing the validation failure.
13. IF Google_CSE returns an error or is unreachable, THEN THE Search_API SHALL respond with HTTP 502 and a JSON body containing an `error` field with a descriptive message.
14. THE Search_API SHALL be mounted in `app.js` under the path `/api/search` following the existing `app.use("/room", roomRouter)` pattern.

---

### Requirement 2: Search Provider and Global State

**User Story:** As a student, I want search state to be managed centrally, so that the overlay, search page, and navbar trigger all stay in sync without duplicating logic.

#### Acceptance Criteria

1. THE Search_Provider SHALL wrap the entire application in `App.jsx` outside the Redux `Provider` boundary, making search state available to all routes.
2. THE Search_Provider SHALL manage the following state fields: `isOpen` (boolean), `query` (string), `results` (array), `loading` (boolean), `error` (string or null), `activeFilter` (string), `selectedIndex` (number), `previewUrl` (string or null), and `recentSearches` (array).
3. THE Search_Provider SHALL expose the following functions via context: `openSearch`, `closeSearch`, `search`, `setQuery`, `setFilter`, `openPreview`, `closePreview`, `clearRecent`, and `removeRecent`.
4. THE Search_Provider SHALL register exactly one `keydown` event listener on `document` for the global keyboard shortcuts and SHALL remove that listener when the provider unmounts.
5. WHEN `closeSearch` is called, THE Search_Provider SHALL reset `results`, `loading`, `error`, `selectedIndex`, and `previewUrl` to their initial values while preserving `recentSearches` and `activeFilter`.

---

### Requirement 3: Global Keyboard Shortcuts

**User Story:** As a student, I want to open and navigate search from anywhere in the app using the keyboard, so that I never have to break my workflow to reach for the mouse.

#### Acceptance Criteria

1. WHEN the user presses `Ctrl+G` or `Ctrl+K` and the focused element is NOT an `<input>`, `<textarea>`, or an element with the attribute `[data-keybinding-context]` (Monaco editor), THE Search_Provider SHALL open the Search_Overlay.
2. WHEN the user presses `Escape` and the Search_Overlay is open, THE Search_Provider SHALL close the Search_Overlay.
3. WHEN the Search_Overlay is open and results are present, pressing `ArrowDown` SHALL advance `selectedIndex` by 1, wrapping from the last result back to index 0.
4. WHEN the Search_Overlay is open and results are present, pressing `ArrowUp` SHALL decrease `selectedIndex` by 1, wrapping from index 0 back to the last result.
5. WHEN the Search_Overlay is open and a result is selected via `selectedIndex`, pressing `Enter` SHALL open that result's `link` in the Preview_Modal.
6. WHEN `Ctrl+G` or `Ctrl+K` is pressed, THE Search_Provider SHALL call `event.preventDefault()` to suppress default browser behavior.
7. WHILE the user is typing in a Room (`[data-keybinding-context]` is focused), THE Search_Provider SHALL NOT open the Search_Overlay in response to `Ctrl+G` or `Ctrl+K`.

---

### Requirement 4: Search Overlay UI

**User Story:** As a student, I want a polished, keyboard-navigable search overlay that matches TabTrack's dark glassmorphism theme, so that searching feels native to the platform.

#### Acceptance Criteria

1. THE Search_Overlay SHALL render via a React Portal into `document.body`, completely outside the Room component tree.
2. WHEN the Search_Overlay opens, THE Search_Overlay SHALL NOT cause a page reload, socket disconnection, video call interruption, Monaco editor state reset, or chat state reset.
3. THE Search_Overlay SHALL be centered horizontally, positioned approximately 15–20% from the top of the viewport, with a maximum width of 680px.
4. THE Search_Overlay SHALL apply a backdrop of `bg-black/50 backdrop-blur-sm` behind the modal panel.
5. THE Search_Overlay panel SHALL use the `glass` utility class (`bg-white/5 backdrop-blur-xl border border-white/10 shadow-glass`) plus a stronger blur (`backdrop-blur-2xl`).
6. THE Search_Overlay SHALL animate open and closed using a combined scale and opacity transition with a duration of 150ms.
7. THE Search_Overlay SHALL render a search input with a height of `h-14` that receives focus automatically when the overlay opens.
8. THE Search_Overlay SHALL render filter pills for the categories: All, Docs, YouTube, Stack Overflow, GeeksforGeeks, MDN, and Research.
9. WHEN a filter pill is selected, THE Search_Overlay SHALL highlight the active pill and trigger a new search if a query is already present.
10. THE Search_Overlay SHALL render a scrollable results list with a maximum height of approximately 55vh.
11. WHILE a search request is in flight, THE Search_Overlay SHALL display Skeleton_Cards in place of Result_Cards.
12. WHEN no results are returned for a query, THE Search_Overlay SHALL display an empty-state message.
13. IF the Search_API returns an error, THEN THE Search_Overlay SHALL display an error-state message with the error description.
14. THE Search_Overlay SHALL render a keyboard hint footer containing the text: "↑↓ navigate  ↵ open  Esc close".
15. THE Search_Overlay SHALL use z-index `z-[200]`, above the Navbar (`z-[60]`) and below the Preview_Modal (`z-[300]`).

---

### Requirement 5: Search Result Cards

**User Story:** As a student, I want each search result to show enough context to decide whether to open it, so that I can quickly find the right resource.

#### Acceptance Criteria

1. THE Result_Card SHALL display the result's `favicon` as an image with a fallback icon when the favicon URL fails to load.
2. THE Result_Card SHALL display the result's `title`, `displayLink`, and `snippet`.
3. WHERE a `thumbnail` value is present, THE Result_Card SHALL display the thumbnail image alongside the text content.
4. WHEN a Result_Card is selected via keyboard navigation (`selectedIndex`), THE Result_Card SHALL apply a highlighted background style to indicate selection.
5. WHEN a Result_Card is clicked, THE Search_Overlay SHALL open the result's `link` in the Preview_Modal.

---

### Requirement 6: Recent Searches

**User Story:** As a student, I want my recent searches saved locally, so that I can quickly re-run a previous query without retyping it.

#### Acceptance Criteria

1. THE Search_Provider SHALL persist recent searches in `localStorage` under the key `tabtrack_recent_searches`.
2. THE Search_Provider SHALL store a maximum of 10 recent search entries, removing the oldest entry when the limit is exceeded.
3. THE Search_Provider SHALL deduplicate entries case-insensitively, moving a repeated query to the front of the list rather than adding a duplicate.
4. WHEN the Search_Overlay opens with an empty input, THE Search_Overlay SHALL display the Recent_Searches list.
5. WHEN the user clicks a recent search entry, THE Search_Overlay SHALL populate the query input with that entry and execute a search.
6. WHEN the user clicks the ✕ button on a recent search entry, THE Search_Provider SHALL remove that entry from `recentSearches` and update `localStorage`.
7. WHEN the user clicks "Clear all", THE Search_Provider SHALL remove all entries from `recentSearches` and update `localStorage`.

---

### Requirement 7: In-Platform Preview Modal

**User Story:** As a student, I want to preview search results inside TabTrack, so that I can read content without losing my place in the app.

#### Acceptance Criteria

1. THE Preview_Modal SHALL render as a full-screen overlay with z-index `z-[300]`.
2. WHEN `openPreview` is called with a URL, THE Preview_Modal SHALL render an `<iframe>` loading that URL.
3. THE Preview_Modal SHALL display a header bar containing a back button, a read-only URL bar showing the current `previewUrl`, an "Open in new tab" button, and a close button.
4. WHEN the "Open in new tab" button is clicked, THE Preview_Modal SHALL open `previewUrl` in a new browser tab.
5. WHEN the close button or back button is clicked, THE Preview_Modal SHALL call `closePreview` and unmount the iframe.
6. IF the iframe content sets `X-Frame-Options` or `Content-Security-Policy` headers that block embedding, THEN THE Preview_Modal SHALL display a fallback message: "This site can't be previewed. Open in new tab?" with a button that opens the URL in a new tab.

---

### Requirement 8: Dedicated Search Page

**User Story:** As a student, I want a shareable search URL, so that I can bookmark or share a specific search query and filter with classmates.

#### Acceptance Criteria

1. THE Search_Page SHALL be accessible at the route `/search` within the existing `Body.jsx` layout wrapper.
2. THE Search_Page SHALL read `q` and `filter` URL query parameters on mount and execute a search if `q` is present.
3. WHEN the URL parameters change (e.g., via browser back/forward), THE Search_Page SHALL re-execute the search with the updated parameters.
4. THE Search_Page SHALL update the browser URL to reflect the current `q` and `filter` values whenever a new search is executed, making the URL bookmarkable and shareable.
5. THE Search_Page SHALL display results in a two-column grid layout on screens wider than 768px and a single-column layout on smaller screens.
6. THE Search_Page SHALL render the same filter pills, loading state, empty state, and error state as the Search_Overlay.

---

### Requirement 9: Navbar Trigger Button

**User Story:** As a student, I want a visible search trigger in the navbar, so that I can open search with a single click in addition to the keyboard shortcut.

#### Acceptance Criteria

1. THE Navbar_Trigger SHALL replace the existing non-functional `<Input placeholder="Search…" />` element in `Navbar.jsx`.
2. THE Navbar_Trigger SHALL display a search icon, the text "Search…", and a `Ctrl+G` keyboard shortcut badge.
3. THE Navbar_Trigger SHALL maintain the same width (`w-[220px]`) and visual style (glass border, muted text) as the element it replaces.
4. WHEN the Navbar_Trigger is clicked, THE Navbar_Trigger SHALL call `openSearch` from the Search_Provider context.
5. THE Navbar_Trigger SHALL be visible only on screens with a minimum width of `md` (768px), matching the `hidden md:block` behavior of the replaced element.
6. THE Navbar dropdown menu SHALL include a "Search" link that calls `openSearch` and closes the dropdown.

---

### Requirement 10: Focus Mode Warning

**User Story:** As a student in a study room, I want a gentle reminder when my search seems off-topic, so that I can stay aware of potential distractions without being blocked.

#### Acceptance Criteria

1. WHEN the current pathname contains `/room/` AND the search query does not contain any of the study-related keywords (`study`, `learn`, `tutorial`, `docs`, `documentation`, `course`, `lecture`, `homework`, `assignment`, `exam`, `research`, `paper`, `algorithm`, `code`, `programming`, `math`, `science`, `history`, `language`) AND results are present, THE Search_Overlay SHALL display the Focus_Mode_Warning banner.
2. THE Focus_Mode_Warning SHALL be a non-blocking yellow banner rendered inside the Search_Overlay, above the results list.
3. WHEN the user clicks the dismiss button on the Focus_Mode_Warning, THE Search_Overlay SHALL hide the banner for the duration of the current overlay session.
4. THE Focus_Mode_Warning SHALL never prevent the user from viewing or interacting with search results.

---

### Requirement 11: Round-Trip and Data Integrity

**User Story:** As a developer, I want the search data pipeline to be reliable and consistent, so that results displayed in the UI accurately reflect what Google_CSE returned.

#### Acceptance Criteria

1. FOR ALL valid search queries, the `results` array stored in Search_Provider state SHALL contain the same number of items as the `results` array in the Search_API response.
2. FOR ALL result objects, the `link` field stored in Search_Provider state SHALL be identical to the `link` field returned by the Search_API, with no mutation or transformation applied.
3. THE Search_API SHALL parse the Google_CSE JSON response and map it to the defined response shape without dropping required fields (`title`, `snippet`, `link`, `displayLink`, `favicon`).
4. FOR ALL valid Configuration objects in Recent_Searches, serializing to `localStorage` and then deserializing SHALL produce an array equivalent to the original (round-trip property).
