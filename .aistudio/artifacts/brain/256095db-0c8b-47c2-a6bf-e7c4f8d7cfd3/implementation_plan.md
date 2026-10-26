# Google Search Console Sitemap Fetch Resolution

Diagnose and resolve the "Couldn't fetch / Sitemap could not be read" error in Google Search Console for `https://www.sotoyfilm.my.id/sitemap.xml` by addressing apex domain 308 redirects, sitemap edge serving performance, and property configuration.

### User Review & Critical Decisions

> [!IMPORTANT]
> Google Search Console does **not follow 301 or 308 redirects** when fetching XML sitemaps. 
> 
> Because your site uses `https://www.sotoyfilm.my.id` as the primary canonical address, requests to the apex domain `https://sotoyfilm.my.id/sitemap.xml` receive an HTTP `308 Permanent Redirect`. Under a **Domain Property (`sotoyfilm.my.id`)**, GSC defaults requests against the apex host or rejects cross-prefix URLs, triggering "Couldn't fetch: Sitemap could not be read".
> 
> **Actionable Fix**: In GSC, add the **URL-prefix property** for `https://www.sotoyfilm.my.id/` (which auto-verifies immediately because your domain is already DNS-verified), and submit `sitemap.xml` there. Concurrently, we will optimize code and edge assets so Googlebot always gets an immediate 200 OK.

- **Confirmed Decision 1**: The user submitted `https://www.sotoyfilm.my.id/sitemap.xml` inside a Domain property (`sotoyfilm.my.id`).
- **Confirmed Decision 2**: GSC reported `Status shows couldn't fetch with sitemap could not be read`.
- **Architectural Solution**: 
  1. Guide user to submit `sitemap.xml` under a `https://www.sotoyfilm.my.id/` URL-prefix property in GSC to eliminate the 308 redirect mismatch.
  2. Sync `data/sitemap-snapshot.xml` into `public/sitemap.xml` and update `scripts/generate-sitemap.ts` so the file can also be served with 0ms latency from Vercel edge CDN.
  3. Update `robots.txt` with an explicit `Allow: /sitemap.xml` rule before `Disallow: /api/*` to guarantee crawler parsers never misinterpret path precedence.
  4. Optimize `api/sitemap.ts` caching headers and fallback response time to ensure zero timeout risk for search bots.

---

### 1. Overview & Core Concept

- **What It Does**: Ensures search engine crawlers (Googlebot, Google-Sitemaps) receive an instant HTTP 200 OK response with pristine XML syntax when requesting `/sitemap.xml`, eliminating GSC fetch errors and accelerating indexation of 300+ movie and article entries.
- **Target Audience**: Search engine bots (Google, Bing, Yandex) and site administrators managing Google Search Console.
- **Key Value**: Fixes sitemap discovery so Google can crawl and index all films, articles, and category pages reliably.

---

### 2. User Experience & Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Google Search Console Setup Flow                     │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │ Open GSC > Property Selector (Top Left)         │
          │ Click "+ Add Property"                          │
          └─────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │ Select "URL prefix" (Right Column)              │
          │ Enter: https://www.sotoyfilm.my.id/             │
          │ -> Auto-verifies immediately (via Domain DNS)   │
          └─────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │ Navigate to Indexing > Sitemaps                 │
          │ Enter "sitemap.xml" in "Add a new sitemap"      │
          │ Click "Submit" -> Resolves 200 OK directly      │
          └─────────────────────────────────────────────────┘
```

- **Step 1: Code Optimization**:
  - Mirror snapshot XML into `public/sitemap.xml` for instantaneous static delivery.
  - Explicitly declare `Allow: /sitemap.xml` in `public/robots.txt`.
  - Ensure `api/sitemap.ts` includes fast memory caching and fallback snapshot logic under load.
- **Step 2: Verification with Live Tools**:
  - Verify `curl -I https://www.sotoyfilm.my.id/sitemap.xml` returns `200 OK` with `Content-Type: application/xml`.
  - Run GSC "URL Inspection" live test on `https://www.sotoyfilm.my.id/sitemap.xml`.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Static Snapshot + Dynamic Handler**
  - *Chosen Approach*: Maintain `public/sitemap.xml` as a static file synced from `data/sitemap-snapshot.xml`, while retaining `api/sitemap.ts` for dynamic updates.
  - *Why*: Static delivery avoids cold starts and database timeouts (Googlebot timeout is under 5 seconds; cold serverless functions querying Firestore can exceed that limit).
  - *Alternatives Considered*: Purely dynamic Firestore queries on every hit (rejected due to cold start latency and potential rate limits).

- **Decision 2: URL-Prefix Property Alignment in GSC**
  - *Chosen Approach*: Recommend adding `https://www.sotoyfilm.my.id/` as a URL-prefix property in GSC in addition to the Domain property.
  - *Why*: Google Search Console handles sitemaps differently in Domain properties vs URL-prefix properties. Domain properties attempt fetching on apex `sotoyfilm.my.id`, which triggers a 308 redirect to `www`. GSC does not follow redirects for sitemap files.
  - *Alternatives Considered*: Removing the 308 redirect on apex domain (rejected because apex-to-www canonical redirection is an essential SEO best practice to prevent duplicate domain dilution).

- **Decision 3: Explicit Allow in `robots.txt`**
  - *Chosen Approach*: Add `Allow: /sitemap.xml` and `Allow: /sitemap.csv` explicitly in `public/robots.txt` right before `Disallow: /api/*`.
  - *Why*: While `vercel.json` rewrites `/sitemap.xml` internally, some strict crawler parsers see `/api/*` disallowed and fail if they inspect rewrite destinations.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Sitemap Delivery Pipeline                       │
└────────────────────────────────────────────────────────────────────────┘

    Googlebot / GSC Crawler
               │
               ▼
   [GET /sitemap.xml]
               │
               ├─────────────────────────────────────────────┐
               ▼                                             ▼
    https://sotoyfilm.my.id                       https://www.sotoyfilm.my.id
        (Apex Domain)                                  (Canonical Host)
               │                                             │
      [HTTP 308 Redirect]                                    │
               │                                             │
      (Rejected by GSC)                                      ▼
                                                  Vercel CDN / Server.ts
                                                             │
                                          ┌──────────────────┴──────────────────┐
                                          ▼                                     ▼
                                  public/sitemap.xml                    api/sitemap.ts
                                   (Static Fast-Path)               (Dynamic + Snapshot Fallback)
                                          │                                     │
                                          └──────────────────┬──────────────────┘
                                                             ▼
                                                    [HTTP 200 OK XML]
                                                    (Accepted by GSC)
```

- **Files Affected**:
  - `public/sitemap.xml`: Create copy of validated `data/sitemap-snapshot.xml`.
  - `scripts/generate-sitemap.ts`: Ensure generation script writes to both `data/sitemap-snapshot.xml` and `public/sitemap.xml`.
  - `public/robots.txt`: Add explicit `Allow: /sitemap.xml` and `Allow: /sitemap.csv`.
  - `api/sitemap.ts`: Tighten headers, verify snapshot fallback.
  - Verification: Run test suite (`npm run test:seo-prefetch`, `npm run test:middleware`, `npm run lint`).
