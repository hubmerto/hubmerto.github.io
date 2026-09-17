# hubmerto.com — search presence

Working record of every change made to how hubmerto.com appears in search, what
it looked like before, and who did what. Newest log entries first.

---

## 1. Summary

**Client** Humberto Gesser (hubmerto) — own site.
**Scope** Get the portfolio indexed. As of 2026-09-14 Google had 2 of 26 known
URLs in the index and the site drew 0–7 impressions a day.
**Problem** The site is a static portfolio whose project pages were assembled in
the browser. The served HTML carried no project text and no link to any project
page, so Google discovered the project URLs from the sitemap alone and never
found a reason to crawl them. Separately, every canonical tag points at the bare
apex domain while the apex 307-redirects to `www`.
**Approach** Put the content and the links in the served HTML, without changing
what the pages look like; then settle the apex/www question at the DNS level.

---

## 2. Baseline — 2026-09-17

Everything below was measured on 2026-09-17 unless noted. Anything not measured
is marked **unverified**.

### Search Console
Source: coverage export `hubmerto.com-Coverage-2026-09-17.zip`, saved to
`evidence/2026-09-17_gsc-*.csv`. Sitemap filter: "All known pages". Data runs to
2026-09-14.

| Metric | Value |
| --- | --- |
| Indexed | **2** |
| Not indexed | **24** |
| Impressions | 0–7 per day, most days 0–2 |

Reasons given:

| Reason | Source | Pages |
| --- | --- | --- |
| Not found (404) | Website | 10 |
| Discovered – currently not indexed | Google systems | 9 |
| Page with redirect | Website | 2 |
| Redirect error | Website | 1 |
| Alternative page with proper canonical tag | Website | 1 |
| Crawled – currently not indexed | Google systems | 1 |
| Duplicate, Google chose different canonical than user | Google systems | 0 |

"Not indexed" fell 32 → 24 between 2026-06-30 and 2026-09-14; "Indexed" stayed
at 2 the whole time.

**Unverified:** which 10 URLs return 404 — the export carries counts only, not
URLs. Also unverified: whether the property is a domain property or a URL-prefix
property, which decides whether these numbers cover `www` as well as the apex.

### Host and redirects
Measured with `curl -sI`:

- `https://hubmerto.com/…` → **307** → `https://www.hubmerto.com/…`
- `https://www.hubmerto.com/…` → **200**
- So `www` is the serving host and the apex is a temporary redirect to it.
- Every `<link rel="canonical">`, every `og:url` and every `sitemap.xml` entry
  pointed at the **apex** — i.e. at a URL that redirects.
- `/karim-boumjimar` → 308 → `/projects/karim-boumjimar` (deliberate, fine).
- A missing path returns a real 404.

### Site, as served (before this work)
Word counts are visible text in the HTML as delivered, scripts and styles
stripped:

| URL | Words in served HTML | h1 | Static links to project pages |
| --- | --- | --- | --- |
| `/` | 48 | 1 | 0 |
| `/projects` | 4 | 0 | **0** |
| `/projects/<any of 8>` | 12 | **0** | — |
| `/contact` | 51 | 0 | 0 |

- Project pages fetched `project.json` and built the whole page — title, body
  copy, credits, outbound link to the client's live site — in JavaScript.
- `/projects` built its tile grid in JavaScript. The Memphy and Emilio Tamez
  tiles were rendered as `<span>`, not `<a>`, so those two pages had **no link
  from anywhere on the site**, in HTML or after rendering.
- `robots.txt`: `Allow: /`, sitemap declared at `https://hubmerto.com/sitemap.xml`. Fine.
- `sitemap.xml`: 13 URLs, no `<lastmod>`. Two of them — `/imprint` and
  `/privacy` — carry `<meta name="robots" content="noindex">`, so the sitemap
  was asking Google to index pages the pages themselves refuse.
- JSON-LD: `WebSite` + `Person` on `/`, a `CreativeWork` on each of the 8
  project pages. None on `/projects`.
- `<title>` on project pages is `hubmerto.<slug>` (e.g. `hubmerto.memphy`).
- Indexable but orphaned and not in the sitemap: `/visualizer`,
  `/scan-chamber`, `/scan-stadium`. `/memphy-brief` is correctly noindex.
- `/emojify` and `/boiler-eggs` exist at the top level and duplicate
  `/projects/emojify` and `/projects/boiler-eggs`; both canonical correctly to
  the `/projects/…` version.

### Other surfaces
**Unverified — not checked in this session:** Google knowledge panel, Wikidata
QID, Wikipedia, and any discipline database. No baseline screenshots taken yet.

### Attribution
- The site, its design, its copy, its existing JSON-LD and OG tags: **PRE-EXISTING** (Humberto).
- Everything in the log below: **MINE**.

---

## 3. Method

Ordered by what was actually blocking indexing, worst first.

1. **Make the project pages reachable.** A page no link points to is a page
   Google has no reason to crawl, and "Discovered – currently not indexed" is
   exactly what Google reports for it. The tile grid on `/projects` now ships as
   real `<a href>` anchors in the HTML.
2. **Put the project text in the HTML.** 12 words is nothing to index. The left
   sidebar — title, credits, body copy, the link to the client's live site — is
   pre-rendered from the same `project.json` the page already used, so the
   served HTML carries 180–315 words per project.
3. **Stop the sitemap contradicting the pages.** Drop the two noindex URLs, add
   `<lastmod>`, generate it so it can't drift.
4. **Settle apex vs www.** Decided: the apex is the real address (it is what the
   whole codebase, the CNAME and every canonical already say). That is a DNS/
   Vercel change, not a code change — see Open items.

Design constraint held throughout: the rendered pages must look exactly as they
did. Verified in the browser at desktop and mobile widths.

---

## 4. Implementation

### `scripts/prerender-projects.mjs` (new)
Run after editing any `project.json` or `projects/catalog.json`.

- Writes the left-sidebar markup for each project into
  `projects/<slug>/index.html`, between `<!-- prerender:sidebar:start -->` and
  `<!-- prerender:sidebar:end -->`, byte-for-byte what `renderLeftSidebar()`
  used to build at runtime. First column title becomes the page's `<h1>`.
- Writes the `/projects` tile grid into `projects/index.html` from
  `projects/catalog.json`, using the same 2/3-per-row span algorithm.
- Stamps `template.js` with a hash of its own contents
  (`template.js?v=<hash>`). Necessary, not cosmetic: a browser holding an older
  cached `template.js` would not know to skip the now pre-rendered columns and
  would render the sidebar twice.
- Idempotent — re-running produces no diff.

### `projects/template.js`
`renderLeftSidebar()` returns early when it finds `.sidebar-section` already in
the rail. The floating tool dock it used to create at the end was split into
`renderWorkspaceTools()` so it still runs on that path.

### `projects/catalog.json` (new)
The tile list, lifted out of the inline script in `projects/index.html`, so the
generator and the page share one source. The Scan Chamber entry is kept with
`"hidden": true` and the note about what it needs before it can be surfaced.

### `projects/index.html`
The inline script no longer builds anything: it wires up the loading spinner and
lazy video against the pre-rendered tiles. Added `CollectionPage` + `ItemList`
JSON-LD naming all 8 projects.

### `scripts/build-sitemap.mjs` (new)
Generates `sitemap.xml`. `<lastmod>` comes from each file's last commit (today's
date while the file is uncommitted), and any page carrying a `noindex` meta is
skipped rather than listed.

### `vercel.json`
Added `/projects/saisonkalender` → `/projects` (301). That page was removed in
`a818554` on 2026-09-02 and is the one 404 that can be confirmed from the repo.

---

## 5. Sources and press index

Outbound client/live-site links now present in the served HTML (they previously
existed only after JavaScript ran):

| Project page | Link | Status |
| --- | --- | --- |
| `/projects/memphy` | https://www.memphy.co | loaded |
| `/projects/karim-boumjimar` | https://karimboumjimar.com | loaded |
| `/projects/marie-matusz` | https://mariematusz.com | loaded |
| `/projects/anonymous-empire` | https://anonymousempire.art | loaded |
| `/projects/emilio-tamez` | https://emilio-tamez-site.vercel.app | loaded |
| `/projects/boiler-eggs` | 5 reference links (Char Stiles, Íñigo Quílez, Patricio Gonzalez Vivo, bleuje, XorDev) | loaded |
| `/projects/emojify` | `/emojify` (internal) | loaded |
| `/projects/strelitzia` | — | no live site |

None carry `rel="nofollow"`; all outbound ones carry `rel="noopener"`.

---

## 6. Metrics

| Metric | Source | Baseline (2026-09-14 data) | Check date |
| --- | --- | --- | --- |
| Indexed pages | Search Console coverage | 2 | 2026-10-15 |
| Not indexed | Search Console coverage | 24 | 2026-10-15 |
| Discovered – currently not indexed | Search Console coverage | 9 | 2026-10-15 |
| Not found (404) | Search Console coverage | 10 | 2026-10-15 |
| Words in served HTML, project page | `curl` + tag strip | 12 | — |
| Static links to project pages | `grep` on served HTML | 0 | — |

Google decides what it indexes and when. What is recorded here is the
contribution, not a promised outcome.

---

## 7. Log

### 2026-09-17 — the 404 list, and the credit links that already existed

**Correction to the baseline.** §2 recorded the 404 URLs as unidentified and
§8 listed getting credit links from client sites as the biggest open item. Both
were wrong, and the second was wrong because I only checked the client
homepages with `curl`. Every one of those sites already credits Humberto, on an
imprint/about/contact page:

| Site | Credit page | Link target | rel |
| --- | --- | --- | --- |
| karimboumjimar.com | `/imprint`, `/contact` | `https://hubmerto.com` | noopener noreferrer |
| mariematusz.com | `/en/about` | apex **and** `www` | noopener noreferrer |
| emilio-tamez | `/imprint`, `/about` | `https://www.hubmerto.com/` | noopener noreferrer |
| anonymousempire.art | `/impressum/` | `https://hubmerto.com` | noopener |
| memphy.co | homepage | `https://www.hubmerto.com` | noopener |

None carry `nofollow`, and every credit page is indexable. Four of these point
at `www` and so now travel through the 308 — worth pointing at the apex on the
sites Humberto controls. `rel="noreferrer"` also strips the Referer header, so
those visits land in analytics as Direct; dropping `noreferrer` while keeping
`noopener` would make the referral visible.

**The 404s** (Humberto pulled the list from Search Console). All ten are from a
**previous portfolio**, not this repo: flat client-name slugs
(`/siemens-energy`, `/nike`, `/naturstrom-rebranding`, `/fullcircle`,
`/ev-chargin-app`), a `/work` index that `/projects` replaced, and a dead `/de/`
locale. The count is already decaying on its own, 15 → 10 since 2026-08-22.
`/projects/saisonkalender` is **not** among them — the redirect added earlier
addresses none of these. It is kept anyway: that page was real until 2026-09-02.

**The "Redirect error" was `https://hubmerto.com/projects` itself**, referred
from `www.hubmerto.com/projects` — the apex→www→apex loop. Last successful
crawl 2026-06-04. The domain flip closed it; the live test now returns "URL is
available to Google" and indexing has been requested.

| Change | Evidence |
| --- | --- |
| Redirects added for `/work` → `/projects`, `/de/work` → `/projects`, `/de` and `/de/:path*` → `/` — the only four old URLs whose subject still exists here | commit `5091b35` |
| The six client-name slugs left as clean 404s. That work is not on this site, so a redirect to `/projects` would be a soft 404 Google drops anyway; `/ev-chargin-app` is a typo in an inbound link, and redirecting it would teach Google the typo is real | deliberate |
| Sitemap resubmitted at the apex, 11 URLs, Success. The old `www` sitemap entry is still registered in Search Console and should be removed so there is one canonical sitemap | Humberto, Search Console |

### 2026-09-17 — apex made canonical (Humberto)
**Attribution: Humberto, in the Vercel dashboard — not my change.**

| Change | Evidence |
| --- | --- |
| `hubmerto.com` set as the primary domain; `www.hubmerto.com` now **308** (permanent) to the apex, path preserved. Chosen over Vercel's default 307 so the consolidation signal is unambiguous | `curl` sweep, this session |
| Result: all 11 sitemap URLs return **200 directly**, no redirect hop. Canonical tag, `og:url`, sitemap and serving host now all say `https://hubmerto.com` | `curl` sweep, this session |
| Repo scanned for hardcoded `www.hubmerto.com` in HTML/XML/TXT/JSON/JS: **none**. The codebase always used the apex — that mismatch is what the flip resolved | `grep -rn`, this session |
| Redirect hops by entry point: apex https 0 · apex http 1 · www https 1 · www http 2 | `curl -L -w '%{num_redirects}'` |

### 2026-09-17 — crawlability pass
| Change | Evidence |
| --- | --- |
| `/projects` tiles pre-rendered as real anchors; all 8 project pages now linked from the served HTML (was 0) | commit `8653429`, `grep -o 'href="/projects/[a-z-]*"' projects/index.html` → 8 |
| Memphy and Emilio Tamez tiles unlocked to `<a>` — both pages previously had no link from anywhere | commit `8653429` |
| Project sidebars pre-rendered from `project.json`; served HTML 12 → 180–315 words, each page gains an `<h1>` | commit `8653429` |
| Outbound live-site links now in served HTML on 6 project pages | commit `8653429`, table in §5 |
| `template.js` cache-stamped so a stale copy can't double-render the sidebar | commit `8653429` |
| `sitemap.xml` regenerated: `/imprint` and `/privacy` dropped (both noindex), `<lastmod>` added, 13 → 11 URLs | commit `8653429` |
| `/projects/saisonkalender` → `/projects` 301 added | commit `8653429` |
| `CollectionPage` + `ItemList` JSON-LD added to `/projects` | commit `8653429` |
| Verified rendered output unchanged at 1024px and 375px; span classes match the live site tile for tile | browser check, this session |
| Deployed and verified live 2026-09-17 20:53Z: 8 static project links on `/projects`, 180–315 words per project page, `memphy.co` in served HTML, sitemap 11 URLs, `/projects/saisonkalender` → 308 → `/projects` | `curl` checks, this session |

---

## 8. Open items

**Needs Humberto**

1. ~~**Set `hubmerto.com` as the primary domain in Vercel.**~~ **Done
   2026-09-17 by Humberto**, with a 308 rather than Vercel's default 307. See
   the log. The canonical mismatch described in the baseline no longer exists.
2. **Point the four `www` credit links at the apex** on memphy.co, the Emilio
   Tamez site and mariematusz.com, and consider dropping `rel="noreferrer"` so
   the referral shows up in analytics.
3. **Remove the `www` sitemap entry** in Search Console.
2. **Export the 404 list from Search Console.** Pages → "Not found (404)" →
   Export. Ten URLs is a lot for a 13-page site and only one
   (`/projects/saisonkalender`) can be identified from the repo. The same export
   would identify the single "Redirect error" URL.
3. **Resubmit the sitemap** in Search Console after this deploys, and request
   indexing for `/projects` — that one page now carries the links to all eight
   project pages.

**Can start now, not yet done**

4. **Page titles.** `hubmerto.memphy` tells Google nothing. Proposed:
   `Memphy — website for a Brooklyn model, DJ and producer · Humberto Gesser`.
   Note `template.js` also rewrites `document.title` at runtime, so both would
   need changing. Held back because it changes the brand voice — Humberto's call.
5. **Mobile rendering.** Google indexes mobile-first, and under 900px the page
   hides the pre-rendered sidebar and builds a separate `.mv-*` view in
   JavaScript. The text and links are in the served HTML either way, but on the
   mobile path the static copy is `display:none` in the rendered DOM. Making
   `renderMobile` reuse the pre-rendered nodes would close that gap.
6. **Orphan pages.** `/visualizer`, `/scan-chamber` and `/scan-stadium` are
   indexable, unlinked and absent from the sitemap. Either link and list them,
   or mark them noindex.
7. **Registrar DNS, optional.** Vercel flags the apex with "DNS Change
   Recommended" and wants the A record on `216.150.1.1`. The current record
   resolves and serves fine, so nothing is broken and this has no search
   effect; it lives at the registrar, not in Vercel.
8. **Baseline the other surfaces** — knowledge panel, Wikidata, Wikipedia — none
   of which were checked in this session.

**Consent / case-study use**

9. Using this as a public case study needs Humberto's written OK. Not requested.

---

## 9. Case study framing

**Before** A portfolio where Google could see the front door and nothing else:
two indexed URLs, eight project pages that nothing linked to, and twelve words
of text on each of them.

**After** Every project reachable and readable in the HTML Google is served,
without moving a pixel of the design.

**Do not claim** any ranking or traffic outcome, or that the work "fixed" the
404s — those URLs are still unidentified. Indexing is Google's decision and the
re-check on 2026-10-15 is what the numbers will come from.
