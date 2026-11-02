# Mobile PageSpeed Optimization & Core Web Vitals Plan

Address the mobile performance score (55/100) and 10.0-second Largest Contentful Paint (LCP) reported in Lighthouse by systematically resolving LCP discovery delays, splitting the monolithic 495 KiB JavaScript bundle, streamlining Firestore home listeners, and serving responsive WebP images.

### User Review & Critical Decisions

> [!IMPORTANT]
> The current mobile audit is bottlenecked primarily by a **10.0s LCP** (2.93s resource discovery delay + 2.11s download) and **10.4s critical path latency** on Slow 4G. The page is lightweight in layout shift (CLS 0.026) and CPU blocking (TBT 190ms), meaning network pipeline, bundle transfer size, and asset discovery are the primary culprits.

- **Confirmed Decision 1 (Image Optimization)**: Use server-side image proxy resizing (`/api/image-proxy`) with WebP formatting and responsive `srcset` for article covers, coupled with right-sized profile avatars and smaller TMDB presets (`w92`/`w154` instead of `w185`/`w342` for list thumbnails).
- **Confirmed Decision 2 (Bundle & Data Loading)**: Implement Vite vendor chunk splitting (`manualChunks`) to isolate heavy libraries (Tiptap, Firebase, Recharts, dnd-kit) and transition homepage Firestore fetching to cached reads (`getDocsFromCache` / SWR) instead of 15+ eager real-time websocket subscriptions.
- **Recommended Default (LCP Delivery)**: Remove eager preloading from inactive slider images (which misled Lighthouse into selecting a hidden image as the LCP) and attach `fetchpriority="high"` and responsive `sizes` strictly to the active hero cover.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the initial mobile loading performance of Sotoy Film from a score of 55 to 90+, dropping LCP from 10.0s to under 2.5s and FCP from 4.4s to under 1.8s on simulated 4G mobile networks.
- **Target Audience / Persona**: Mobile readers on smartphones (e.g., Moto G, iPhone, standard Android) accessing film reviews, articles, and recommendations over cellular data.
- **Key Value**: Delivers instant visual feedback, reduces mobile data consumption by over 400 KiB per page visit, and boosts search ranking signals through stellar Core Web Vitals.

---

### 2. User Experience & Visual Design

- **Hero Slide Experience**:
  - The primary active slide renders instantly with crisp WebP resolution matching the mobile viewport width.
  - Inactive slides load on-demand when the user advances the carousel or during browser idle time, preventing background slides from competing with the active cover for network bandwidth.
- **Progressive Hydration & Perceived Performance**:
  - The skeleton layout shell (`#app-shell`) remains lightweight and seamless.
  - Modals (Login, Compose Buzz, Suspended Account) and non-visible widgets are dynamically imported only when triggered by user interaction.
- **Visual Typography & Stability**:
  - Preserves all existing typography (Geist, Plus Jakarta Sans) and high-contrast dark aesthetic (`#0A0A0A` background with `#D81B60` / `#FF2E7E` accents).
  - Maintains strict zero-CLS layout stability by fixing explicit aspect ratios and `sizes` attributes on all responsive image containers.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Vite Vendor Chunking (`manualChunks`)**
  - *Chosen Approach*: Split heavy third-party ecosystems into isolated chunks (`vendor-editor` for `@tiptap`, `vendor-firebase` for Firebase SDKs, `vendor-charts` for Recharts, and `vendor-ui` for Lucide & motion).
  - *Why*: The homepage currently ships 495 KiB of JS because editing libraries and chart dependencies are bundled into `index.js`. Separating them reduces the homepage critical JS payload by ~55%.
  - *Alternatives Considered*: Dynamic imports only at page level (insufficient because shared dependencies still leak into the main entry bundle).

- **Decision 2: Image Proxy Resizing (`/api/image-proxy`) with WebP & Srcset**
  - *Chosen Approach*: Expand `/api/image-proxy` to support `w` (width) and `fmt=webp` query parameters with edge caching, and wrap editorial images in responsive `srcset` attributes.
  - *Why*: Saves ~420 KiB on the homepage by serving 480px/720px WebP images instead of uncompressed 1080px JPEGs from Firebase Storage.
  - *Alternatives Considered*: Manual re-upload of all legacy assets in Firestore (impractical and doesn't solve future author uploads).

- **Decision 3: Streamlining Homepage Firestore Connections**
  - *Chosen Approach*: Fetch homepage section data using cached Firestore reads / SWR pattern, deferring live `onSnapshot` subscriptions to dedicated interactive views (e.g. active community chat or user notifications).
  - *Why*: Lighthouse caught over 15 concurrent `/Listen/channel` requests firing simultaneously during the first 6 seconds, choking the Slow 4G connection.
  - *Alternatives Considered*: Keeping all real-time listeners (severely damages mobile LCP and bandwidth).

- **Decision 4: Fixing Preconnect & Resource Discovery**
  - *Chosen Approach*: Correct the `crossorigin` attribute on `https://firebasestorage.googleapis.com` in `index.html` (matching standard `<img>` non-CORS request mode) and add preconnects for Firebase Auth and Firestore origins.
  - *Why*: Resolves the "Unused preconnect" audit in Lighthouse and saves 300–370 ms in handshake latency.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Mobile Request & Render Pipeline                  │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Initial HTML Document (index.html)                                  │
│    - Preconnect to Firebase origins without CORS mismatch              │
│    - Inline app shell with responsive logo                             │
│    - CSS loaded with high priority, async font swap                    │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ 2. Split JS Bundles (Vite)      │ │ 3. Homepage Data Cache (SWR)    │
│    - index.js (core runtime)    │ │    - Instant cache/REST read    │
│    - vendor-firebase.js         │ │    - No blocking channel storms │
│    - Deferred: tiptap, recharts │ │    - Defer secondary widgets    │
└─────────────────────────────────┘ └─────────────────────────────────┘
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Hero Section LCP Prioritization                                     │
│    - Active slide: fetchpriority="high", responsive srcset (WebP)      │
│    - Inactive slides: loading="lazy", deferred render                  │
│    - TMDB thumbnails: w92 / w154 resolution                            │
│    - Author avatars: 64x64 px proxy thumbnail                          │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. /api/image-proxy Edge Resizer                                       │
│    - Query: ?url=...&w=480&fmt=webp                                    │
│    - Upstream fetch -> Resize & convert -> Cache-Control 1 year        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Step-by-Step Implementation Sequence

1. **Preconnects & HTML Entry (`index.html`)**:
   - Fix `<link rel="preconnect" href="https://firebasestorage.googleapis.com">` (remove misconfigured `crossorigin` so image tags utilize the TCP socket).
   - Add `<link rel="preconnect" href="https://firestore.googleapis.com">` and `https://gen-lang-client-0523736875.firebaseapp.com`.
   - Update `/sotoy-logo-full.webp` styling and dimensions in `#app-shell`.

2. **Bundle Optimization (`vite.config.ts`)**:
   - Add `build.rollupOptions.output.manualChunks` to split:
     - `vendor-tiptap`: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `tiptap-markdown`.
     - `vendor-firebase`: `firebase/app`, `firebase/firestore`, `firebase/auth`, `firebase/storage`.
     - `vendor-charts`: `recharts`.
     - `vendor-dnd`: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
     - `vendor-icons`: `lucide-react`.

3. **LCP Image Prioritization (`HeroSection.tsx`)**:
   - Only apply `fetchPriority="high"` and `loading="eager"` to `index === safeSlide`.
   - Set `loading="lazy"` on inactive background slides to stop network contention.
   - Attach responsive `sizes` attribute: `sizes="(max-width: 1024px) 100vw, 66vw"`.

4. **Image Proxy & Asset Right-Sizing (`api/image-proxy.ts` & Image Utilities)**:
   - Enhance `handleImageProxy` to support basic geometry queries (`w`) and WebP encoding for Firebase Storage images.
   - Update `HeroActiveAuthorBadge`, `EditorialSidebar`, and TMDB poster helpers to pass appropriate target sizes (`w154`/`w92` for list cards and `64px` for avatars).

5. **Modals & Lazy Loading (`src/App.tsx`)**:
   - Wrap heavy modals (`LoginModal`, `ComposeBuzzModal`, `SuspendedAccountModal`) in `React.lazy` and suspense boundaries so they don't bloat the initial render tree.

6. **Verification & Build**:
   - Run `compile_applet` to guarantee complete TypeScript validation.
   - Verify bundle size outputs and verify dev server health.
