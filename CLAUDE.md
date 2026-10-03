# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is the pre-implementation workspace for **o-mac.ro**, a new e-commerce site for O'MAC S.R.L. (Pitești, RO). It sells garden, agricultural and household machinery under the O'MAC private label. There is no application code, build system or test suite yet. There is also no git repo. The platform/stack has **not** been chosen: the client leaves that to the bidder, judged on (1) a non-technical person can run it, (2) total 5-year cost, (3) vendor portability, and (4) support for ~40 technical attributes with per-category facets. When code is added, update this file with build/test commands.

- `docs/`: the client's specs, all in Romanian. When they contradict each other, follow them in this order:
  1. `Anexa-1-caiet-de-sarcini-o-mac.pdf`: annex; overrides the spec
  2. `Caiet-de-sarcini-o-mac-Faza-1_5.pdf`: Phase 1 spec (modules, URLs, data model, checkout, legal, acceptance criteria)
  3. `Instructiuni-pentru-programator-o-mac_1.pdf`: implementation rules for developers
  4. `Ghid-vizual-machete-o-mac.pdf`: visual guide, 105 landscape pages (see "Visual guide" below)
  5. the mockups themselves
- `proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34/`: pitch PoC — Three.js exploded view of the MF 34 chainsaw (see its README). No build step; serve with `python3 -m http.server` from that folder. Tests: `npm test` (node --test, pure modules) and `npm run e2e` (Playwright + Chromium); single unit test file: `node --test tests/parts.test.mjs`. All part data (169 positions from the factory exploded-view sheets in `assets/`) lives in `parts.js`; geometry is in `geometry/` (one builder per position). Never add codes or prices that aren't in the client's material, and never write the factory model designation printed on those sheets anywhere in the project (`tests/no-factory-name.test.mjs` enforces it).

All user-facing text and the admin UI are Romanian only. `[.....]` in the specs marks info the client still has to supply. Don't invent values for it; ask.

## Scope

**Phase 1:** Homepage, Portfolio (22 categories + filters), Product page, Cart & 3-step checkout (card / cash on delivery / bank transfer with pro-forma), Blog, and a standard customer account with order history.

**Phase 1.5:** the accessories & consumables shop (~418 SKUs).

**Phase 2:** spare parts with exploded diagrams, MyO'MAC (product registration, warranty), and editorial range pages.

The architecture must allow the later phases without rework. In particular, the product template needs an empty slot reserved now for the spare-parts module.

**Paid PoC (2 weeks):** read 20 real items with price/stock from the ERP → show them on a page → push an order to the ERP → re-push the same order and verify no duplicate document is created.

## Architecture constraints (from the specs)

- **ERP integration is decoupled.** The ERP is SeniorERP. Data flows `SeniorERP → integration layer (own DB) → site DB → site`, and orders are pushed back through a queue with retries. The site never reads the ERP directly. No theme/frontend code may reference the ERP by name. Swapping the ERP should mean rewriting one layer.
  - **The ERP owns:** SKU, price, stock, customers, orders, invoices.
  - **The site owns:** categories, range, technical attributes, copy, images, documents, SEO and part↔machine compatibility.
  - **Join key:** the SKU is the only one.
  - **Sync cadence:** stock/price every 15–30 min, full catalog nightly, orders immediately, weekly reconciliation.
  - **Order pushes must be idempotent.**
  - **Operations:** keep a full sync log, an admin sync-status screen, and an alert when sync stops.
  - **Stock display:** show it as a status (in stock / last N / out of stock / on order), never as an exact number.
- **Range ("gama") is a single-valued product attribute, never a category.** The values are Smart, MaxX, Power and ProX. Range filtering must work three ways, each with its own indexable URL: range alone, range + category, and range + category + facet.
- **Categories:** exactly 22, in a flat list, in the fixed order from spec ch. 11 (not alphabetical). Facets are configured per category, not as one global list.
- **Attributes:** imported from a client-supplied governed attribute file (~40 attributes with units and allowed values), never typed by hand. No PIM, no CRM. Weight and three dimensions exist on every SKU from day one; shipping is calculated from them.
- **Spare parts model (Phase 2):** `machine → assembly (id, name, diagram image) → callout (position no. + percentage x/y coordinates, not pixels) → part (code, name, qty, class; A = wear part)`. The parts catalog holds no prices or stock; those come from the ERP by code.
- **URLs:** Romanian, transliterated, with no parameters in paths and no product codes.
  - Product URLs: `/produse/{categorie}/{produs}`.
  - Other routes: `/cos`, `/comanda`, `/comanda/confirmare`, `/contul-meu`, `/blog`, `/blog/categorie/{slug}`, `/blog/{articol}`, `/cautare`.
  - Filters go in query params (e.g. `?gama=prox&putere=7-9`), and every product has one canonical URL.
  - Pagination must stay indexable.
  - A 301 redirect map is required for the ~700 old URLs and ~125 old blog posts.
- **Search:** global, from one field on every page. It covers products, parts and articles, ignores diacritics in both directions, matches partial product codes, and links straight to the product.
- **SEO:**
  - Unique meta title and description on every page.
  - JSON-LD: Product, Offer, BreadcrumbList, Organization, FAQ, BlogPosting/Article.
  - An auto-generated sitemap.
- **Blog editor blocks (not raw HTML):**
  - Section, with exactly 4 color treatments and auto-numbering.
  - Auto-generated table of contents from the H2s.
  - Photo placeholder showing "TBD" plus a hint.
  - "Big number" block.
  - Product card that pulls name, code, price and stock live from the catalog.
  - Preview-only internal note.
  - Sources block with `rel="nofollow noopener"`. It is mandatory; an article can't be published without it.
- **Checkout:**
  - Prices are shown with VAT (19%) and broken down in the summary.
  - If shipping is unknown, show "de la X lei" instead of a total. Never show a fake total.
  - Card data goes only through the processor's hosted page.
  - Validate only fields that are currently visible.
- **Transactional emails:** confirmation, paid, shipped (with AWB tracking number), cancelled, password reset and pro-forma. All are in O'MAC branding.

## Front-end rules (acceptance is checked against these)

- **Two stylesheets.**
  - `brand.css` is supplied by the client and **must never be edited**. It holds the color, size-scale, typography and line-height variables.
  - `pagina.css` is where the site styles go.
  - Never hard-code a color or size; use a variable. If one is missing, ask; don't invent it.
- **Colors:**
  - Gray `#53565A`.
  - Orange `#FF824B`. For small text on white use `#A8481F`, because `#FF824B` fails contrast.
  - White `#FFFFFF` (a brand color).
  - Secondary grays: `#757A80 #909499 #ABAEB3 #C4C7CC #DFE1E6 #EBEDF0`, plus panel `#F2F2F3`.
  - Replace the legacy values `#EA7E46`, `#68696D` and `#F19257` with the colors above.
  - Status colors are still undecided.
- **No dark mode.** Set `color-scheme: light` and add no `prefers-color-scheme` rules anywhere.
- **Fonts:**
  - Headings use Pressio Condensed with `font-feature-settings: "ss01" 1, "case" 1` always on (the visual guide adds `case`). When subsetting, keep the features with `--layout-features+=ss01,case,liga,locl,kern`, then check the output file: J and r should change shape when ss01 is toggled.
  - Body text uses Proxima Nova, with Arial/Helvetica as the only allowed fallback. Never substitute Google-Fonts lookalikes.
  - Self-host the fonts with `font-display: swap`; don't link to Google Fonts.
- **Size scale:** base 22, ratio 1.2: `7 9 10 12 15 18 22 26 32 38 46 54 66 78 94 114 136`, as variables (`--t18`, `--t26`, …). Use it for spacing too.
- **Line heights:** title ×1.05, subtitle ×1.2, body ×1.3.
- **Alignment:**
  - Text is always left-aligned, with no centering or justify.
  - Exceptions: numeric columns (prices, quantities) are right-aligned, and button labels are centered.
- **Brand spelling:**
  - The ranges are written `Smart LINE · MaxX LINE · Power LINE · ProX LINE`. Never put these through `text-transform: uppercase`.
  - `MyO'MAC` is never uppercased; isolate it with its own class.
  - Never place a range name under the O'MAC logo. On the web, use the logo without ®.
  - Never mention competitor or manufacturer brands commercially, and never write "exclusiv".
  - The company name is O'MAC S.R.L.
- **Breakpoints:** one set, defined once in shared CSS; don't add per-component breakpoints.
  - **The documents disagree.** Spec ch. 12 (rank 2) lists 1180 / 1080 / 900 / 820 / 560. Instructiuni and the visual guide both list 560 · 760 · 820 · 900 · 1180, and the mockups break there. Confirm with the client whether 1080 or 760 is right.
  - Blocks must step through intermediate layouts, never jumping straight from 3 columns to 1.
  - Product grid: 3 columns above 1180, 2 columns down to 560, 1 below.
  - Header utilities collapse into the menu below 1080.
  - The filter rail moves above the grid below 900.
- **Header:** a single component shared by every page; build it first.
  - On phones the menu goes behind a button. The annex overrides the spec's "two-row nav below 820".
  - Logo, search and cart stay visible at every width, including 390 px, and the cart shows a counter.
  - Main menu: Produse · Piese schimb · MyO'MAC · Despre noi · Blog.
- **Component states:** every interactive component needs rest, hover, keyboard focus, pressed, disabled, loading and error states.
  - The keyboard focus ring must stay visible.
  - Touch targets are at least 44×44 px.
  - Never convey status by color alone.
  - Tables scroll horizontally on their own; the page never scrolls sideways.
- **Performance:** measured on mobile. LCP < 2.5 s, CLS < 0.1, INP < 200 ms. Declare image dimensions and lazy-load images below the fold. Contrast must meet WCAG AA.

## Visual guide (`Ghid-vizual-machete-o-mac.pdf`)

Each mockup is sliced into 1440×900 desktop frames, followed by 390 px phone frames. Each mockup is preceded by a one-page requirements sheet. `pdftotext` (poppler, installed via Homebrew) extracts only those sheets. To see the frames, view the PDF pages as images.

| Pages | Screen | URL |
|---|---|---|
| 3–15 | Home (white hero) | `/` |
| 16–28 / 29–41 | Home, orange / gray hero variants | `/` |
| 42–44 | "Produse" mega-panel | — |
| 45–50 | Category (Motocultoare) | `/produse/motocultoare` |
| 51–65 | Product page (MC 8) | `/produse/motocultoare/mc-8000s` |
| 66–74 | Spare parts entry (Phase 2) | `/piese` |
| 75–80 | Spare parts: model picker | `/piese/motocultoare` |
| 81–85 | Exploded diagram | `/piese/motocultoare/mc-8000s` |
| 86–89 | Cart & checkout | `/cos`, `/comanda` |
| 90–95 | Blog list | `/blog` |
| 96–105 | Blog article | `/blog/…` |

Screen rules that go beyond the spec:
- **Never invent data.** Prices, codes, stock and specs come from internal systems. Where data is missing, leave a visibly marked placeholder (as the mockups do with "FOTO" boxes); never fill in plausible values. The prices in the mockups are demo data.
- **Home:**
  - The three hero variants are alternatives. The client picks one before build; don't ship a switcher.
  - Fixed block order: header, hero, category portfolio, four ranges, parts, trust blocks (warranty / network / service), blog, footer.
  - No auto-advancing carousels.
- **Produse panel:**
  - Opens on click or keyboard, never on hover, and closes on Esc or an outside click.
  - Categories sit in 3 columns in spec order. A category without a photo keeps a marked empty thumbnail; the row is never dropped.
  - Right column: the range picker, plus links to Piese de schimb, Accesorii and Consumabile.
- **Category page:**
  - Filters are open by default on desktop. On phone they sit in a panel opened by a button.
  - Sorting always has a default.
- **Product page:**
  - Section order is fixed.
  - The mockup shows a sticky bottom buy bar with name, range, price and add-to-cart.
  - Specs and in-box contents go in tables.
  - Stock is shown as a status.
  - A link to the model's exploded diagram must be visible without long scrolling.
- **Parts module (Phase 2):**
  - Three entry paths: by machine, by part code, or by part category.
  - Code search ignores diacritics, hyphens and spaces, and matches exact codes or fragments.
  - Wear parts get the same visible marker everywhere.
  - Models with no diagram yet stay listed, with their status shown.
  - Exploded diagram: drawing on the left, parts list on the right, linked both ways (click a callout to highlight its row; hover a row to highlight its callout). One assembly at a time is shown, chosen from a selector. On phone the drawing goes above the list.
- **Checkout:**
  - Guest checkout, with account creation optional at the end.
  - The shipping cost is visible before the payment step.
- **Blog:**
  - Same header, footer and fonts as the rest of the site.
  - Pagination, not infinite scroll.
  - Products are linked by code, not by name.
  - Articles use a constrained text column. Images need captions, and an image without a source isn't used.
