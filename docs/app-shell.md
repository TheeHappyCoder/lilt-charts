# Lilt application design

**Current presentation:** The direct implementation pass removes
the application top header and desktop collapse behavior. Keep the sidebar open on desktop,
with one shared canvas and Hugeicons Free. Mobile navigation opens beside the page title.

**Revision 5 authority:** `product.md` now owns all application information architecture, navigation, page composition, responsive controls, examples and adoption flows. `architecture-v2.md` owns the new chart composition. Retain this document's pinned clean-shell source, Manrope, palette and framework guidance. All older Catalog/Chart detail/guide-flow instructions below are historical where they conflict. Current work is Assignment 04.

**Revision 4 workflow update:** The chart workspace pass replaces this document's Navigation and routes, Catalog, Chart detail and related app-flow instructions. Retain the clean-shell source, typography, palette, responsive shell and framework decisions below. The four-card catalog and page-level Preview/Code/Data tabs are historical directions, not the current implementation target.

Architect decision, revision 3, 2026-09-22. The user explicitly selected [clean-shell](https://github.com/TheeHappyCoder/clean-shell) and requested a modern font such as Manrope. This document supersedes the earlier standalone Vite demo, system font, and no-sidebar directions. The chart library remains independent.

## Source and implementation decision

Use the actual clean-shell source at revision `d599a74ffdf2778e9e8c74776a5ad316a34caab8`. The architect inspected its source through an authenticated temporary checkout. To reproduce that inspection, clone the user-specified repository to a separate temporary directory and check out the pinned revision. Do not overwrite the Lilt repository with a clone.

Adopt its Next.js App Router shell inside `apps/showcase`. Keep `packages/charts` and its Vite package build. Preserve the shell's composition and motion by adapting these actual files and their necessary local imports:

- `components/dashboard/practice-shell.tsx`: viewport frame, sidebar/content relationship, inset scrolling main surface.
- `components/dashboard/practice-sidebar.tsx` and `lib/sidebar-motion.ts`: sidebar rows, collapse behavior and interaction.
- `components/app-topbar.tsx`: toggle and breadcrumb bar.
- `components/theme-switcher.tsx` and its theme provider: three-mode control and circular theme transition.
- `lib/animation/text-ease.ts`: shell motion tokens.
- `app/globals.css`: effective semantic palette, radii and theme-transition styling.
- Required `components/ui` primitives and `lib/utils.ts`. Copy their actual dependency closure, not all unrelated controls.

Rename the adapted product shell to Lilt. Record source-to-destination paths in the handoff. Use the source as the implementation baseline, not a screenshot to imitate.

The source includes demo authentication and placeholder business pages. Lilt opens publicly into its library; omit the login gate, fake identity, profile/sign-out menu, and Dashboard/Projects/Activity/Settings placeholders. Adapt the existing sidebar footer to contain the real theme control. This does not require a backend, account, billing or fake workspace switcher.

## Typography

**Manrope is the interface and chart font.** The selected shell already uses it. Load it once in the Next root layout using `next/font/google`, latin subset, variable font, `display: 'swap'`. Give it a distinct variable such as `--font-manrope` and map Tailwind's sans token to it; avoid a self-referential `--font-sans` mapping. Retain Geist Mono for code only.

| Role                   | Size / line height          | Weight / tracking |
| ---------------------- | --------------------------- | ----------------- |
| Sidebar and breadcrumb | 13 / 18px                   | 500 / -0.01em     |
| Page title             | 28 / 36px, mobile 24 / 32px | 600 / -0.035em    |
| Page description       | 14 / 21px                   | 400 / normal      |
| Card title             | 15 / 21px                   | 600 / -0.015em    |
| Chart title            | 14 / 20px                   | 500 / -0.01em     |
| Main chart total       | 34 / 42px, narrow 30 / 38px | 500 / -0.04em     |
| Chart delta / metadata | 12 / 18px                   | 400 / normal      |
| Axis labels            | 12 / 16px                   | 400 / normal      |
| Tooltip values         | 13 / 18px                   | 500 / normal      |
| Code                   | 13 / 20px                   | 400 / normal      |

Use tabular numerals for numbers, dates and changing values. The package inherits fonts; it must not download Manrope. Invalidate cached label/tooltip bounds when fonts finish loading. Do not compensate for font loading by replaying the chart entrance.

## Shell and surfaces

Retain the shell's 8px outside inset and one main scrolling region. The desktop sidebar is 208px wide and permanently open. There is no top bar, collapsed rail or rounded outer content panel. Desktop content padding is 32px, reducing at smaller breakpoints. The page title and chart sit directly in the shared canvas.

Use the **effective final semantic colors** in clean-shell's stylesheet. Earlier definitions in that file are overridden; do not accidentally pick the older blue palette.

| Role                     | Light                             | Dark                              |
| ------------------------ | --------------------------------- | --------------------------------- |
| Outer chrome             | `#F7F7F5`                         | `#111111`                         |
| Main surface             | `#FFFFFF`                         | `#191919`                         |
| Raised card              | `#FFFFFF`                         | `#202020`                         |
| Text                     | `#37352F`                         | `#D9D9D8`                         |
| Muted text               | `#787771`                         | `#9B9B98`                         |
| Border                   | `#E7E7E4`                         | `#333331`                         |
| Hover / selected neutral | `#F1F1EF`                         | `#242424`                         |
| Sidebar                  | Transparent over the outer canvas | Transparent over the outer canvas |

Chart series retain Lilt jade (`#168267` light / `#67D9AF` dark). Inside this app, map chart surface, text, muted, grid, border and tooltip variables to the shell's neutral palette. Skeleton: `#C4C5C0` light / `#646661` dark. Inverse axis badges: `#37352F` with white text light; `#D9D9D8` with `#191919` text dark. Keep colored accents concentrated in data and focus. Use 12px chart/catalog card corners and one-pixel borders. No colored page wash, gradient hero, decorative KPI dashboard or stacked card shells.

## Navigation and routes

Brand: **Lilt Charts**, in the existing shell brand slot. Use a small 24px square containing an original simple `l` monogram, with the shell's existing brand motion. Do not retain the Clean Shell wordmark or introduce a new illustration.

Sidebar section **Charts**:

- **All charts** → `/charts`.
- **Area** → `/charts?type=area`.
- **Line** → `/charts?type=line`.

Sidebar section **Resources**:

- **Motion guide** → `/guides/motion`.
- **Installation** → `/guides/installation`.

Use Hugeicons Free's Stroke Rounded icons, 16px with a 1.5 stroke, and the retained sidebar row layout. Import individual icons from `@hugeicons/core-free-icons` and render them with `@hugeicons/react`. Selected state reflects the current route/filter; detail pages select their family. Navigation labels remain visible on desktop. The sidebar floats over the shared page canvas, without an outer workspace card.

The footer contains the existing System / Light / Dark control. Root `/` redirects to `/charts`. The top bar uses real breadcrumbs: `Charts` on the catalog, `Charts / Revenue area` on a detail, and `Resources / Motion guide` on a guide. No pretend global search, notifications or organization menu.

Mobile under 768px opens navigation from a menu button beside the page title. Its accessible modal drawer retains focus containment, Escape, backdrop dismissal and focus return. Clicking a destination closes the mobile drawer. Desktop navigation has no collapse state or toggle.

## Catalog

The opening screen is a browseable chart catalog. Content is centered with max width 1120px.

Header: `Chart library`, followed by `Explore the details. Use the same components in your app.` Leave 24px before the filter row.

Filter row: All / Area / Line segmented control on the left, 240px search field on the right, placeholder `Find a chart`. Both actually filter the four entries below. Type is reflected in the URL; text search can stay local. At narrow widths the search moves below and fills the row. Announce the result count politely only after the result changes. An empty result reads `No charts found` with a working Clear filters action.

| Slug                | Card title           | Family | Subtitle and preview                                                                                                         |
| ------------------- | -------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `revenue-area`      | Revenue area         | Area   | `A soft fill with a precise reading.` Primary area/line plus dashed previous-period comparison, exact September fixture.     |
| `revenue-line`      | Revenue line         | Line   | `Every point, without the fill.` Same primary revenue series alone, no area.                                                 |
| `period-comparison` | Period comparison    | Line   | `Two periods, one shared timeline.` Primary and dashed previous-period lines, no area.                                       |
| `missing-data`      | Missing observations | Line   | `Gaps remain gaps.` Primary line with revenue null at zero-based indices 6, 7 and 18; previous-period line remains complete. |

Use a two-column grid when content width is at least 680px, one column below, gap 16px. Each tile has 20px padding, title and subtitle at top, a 160px-high real library chart, then a quiet family label and arrow. The thumbnail uses the actual fixture and package primitives with no axes, tooltip or KPI. It is decorative within one accessible card link; do not nest interactive chart controls in the link. All titles and descriptions remain selectable/readable.

Do not add blank future cards, status chips or invented popularity counts. All four cards lead to working detail pages. Catalog filtering and navigation are separate from chart inspection.

Catalog hover/focus: border darkens slightly, arrow shifts 3px, and a neutral hover surface fades in over 160ms. No tilt or bounce. Charts draw once on initial visible entry over 420ms and then rest; filtering can use a 160ms opacity/6px entry. A filter does not force every surviving chart to remount. No endless replay on hover.

## Chart detail

The catalog slug route described below was superseded by the current chart browser. Use `/charts?chart=area|line|bar` and the explicit family routes in `product.md`; obsolete slug redirects are removed.

Page title is the catalog title, description is its subtitle. Right-aligned neutral `Copy code` button copies the actual currently configured public-API example and becomes `Copied` with a 150ms bounded icon/text swap. Restore after 1.5s; on failure show `Could not copy` and keep the selectable Code tab available.

Below the header: Preview / Code / Data underline tabs, using the shell's real tabs primitive. All three tabs work. Keep their state local to the detail; route changes reset to Preview. Preserve a chart while changing tabs, suspend it while hidden, and do not replay loading on return. Use 200ms indicator motion and at most a 150ms content fade; reserve the preview's height to avoid a collapsing page.

**Preview** contains one chart card, not a card around another card. Its internal layout comes from the architect's motion study:

1. Upper left: `Daily revenue`, total on the next line, then delta; do not move the KPI to the right.
2. Upper right: Area / Line segmented control. The route determines the initial configuration; this control demonstrates fill visibility and does not navigate.
3. Below summary: `September 1–28, 2026 · USD` in muted text.
4. Full-width plot. Desktop SVG height 330px, margins top 12, right 12, bottom 44, left 72. At chart width below 420px use SVG height 278px and left 65px; reserve a separate 112px inspection row. Do not sacrifice readable axes to fit a fixed page height.
5. Quiet legend below the plot, matching visible descriptors. Legend is informational in this repair; no fake toggle or pressed state.
6. Outside the chart card, one small control row: `Demo data · UTC` on the left; neutral `Preview loading` / `Show data` and `Update data` controls on the right. Below 480px allow wrapping. Status has a reserved slot so `Updating` does not shift buttons.

The revenue-area detail is the primary visual acceptance surface. It must match the study's chart hierarchy, line weights, skeleton and interactions, with only the deliberate Manrope/shell changes. The other variants reuse the same implementation and controls.

Summary is always derived from the current fixture. For missing-data, sum only known revenue values and display `Known revenue` with `25 of 28 days recorded`; omit the percentage comparison rather than compare partial current totals with a complete period. The tooltip keeps `No data` rows at missing samples.

Area / Line changes only the primary fill: 260ms opacity and a 240ms sliding selection plate. It never removes/recreates the chart, changes its domain or replays entrance. The previous-period line remains dashed in variants that contain it.

**Code** is a selectable, horizontally scrollable code panel with a working copy action. Generate the example from the same variant/config descriptor used to render Preview. Show imports, stylesheet import, relevant props and mark composition. Include or clearly reference the displayed fixture. Do not claim `@lilt-ui/charts` is published.

**Data** is a real accessible table of the currently accepted observations, in the same date order. Columns Date, Revenue, Previous period when applicable. Null reads `No data`, not zero. Use tabular figures; contain horizontal overflow within the panel. The chart's accessible description points users to the Data tab; do not duplicate the table in an announced hidden copy.

## Guides

`/guides/motion`: a quiet text page, max width 720px, describing Loading, Inspection, Updates and Reduced motion in plain language. Reuse the facts in motion.md, link to the revenue-area detail to try them, and do not create a separate animation engine.

`/guides/installation`: accurate current local workspace / packed-tarball setup, CSS import, client component requirement in Next, and one complete public-API composition. Say the package is currently local/private. Do not invent an npm installable release.

Do not expose diagnostics and implementation controls throughout the product UI.

## App motion and accessibility

Preserve clean-shell's sidebar hover/press and System/Light/Dark circular transition. The desktop sidebar no longer collapses. Map imported `framer-motion` uses to the existing `motion/react` dependency so the application does not ship two Motion versions; validate equivalent behavior.

New page content enters with 6px upward travel and opacity over 240ms, using `[0.16, 1, 0.3, 1]`. The shell stays mounted across route changes. Do not add an exit delay that blocks navigation. Typography stays sharp; no page-wide blur on navigation.

Theme changes use the source circular transition when supported, immediate paint fallback otherwise, and immediate settled paint for reduced motion. A theme change must preserve chart data, pin, geometry and animation identity. The chart must not replay loading because theme changed.

Every new control uses the shell focus treatment and native/Base UI semantics. Under reduced motion, settle slides, springs, route reveals, theme sweeps and skeleton sheen; retain a steady skeleton while values are unknown. A control may remain disabled only while its documented action is in progress, not because an old transition callback was lost.

## Framework and delivery

Keep pnpm, React 19.3.0 and Motion 13.4.0 from the workspace. Pin Next.js and eslint-config-next together at 16.3.5, verified from the registry during architect research. Use the shell's Base UI 1.6.0, next-themes 0.4.6, Tailwind/PostCSS integration 4.3.2, and only remaining dependencies actually imported. Icons use `@hugeicons/react` 1.1.10 and `@hugeicons/core-free-icons` 4.3.5 at the user's explicit direction. Pin exact resolved versions; do not copy `next: latest` or the source's mismatched eslint-config-next 15.3.1. Preserve existing valid library tooling.

The app may use Tailwind, Base UI and Next. The chart package may not depend on any of them. App accessors/formatters belong in client components; do not pass functions across a Server Component boundary. Preserve a `"use client"` directive in the library's built interactive entry and use SSR-safe `useId` for SVG definitions.

Development must respond to package source changes. Preferred setup: an explicit development-only exact `@lilt-ui/charts` / stylesheet source alias in Next's Turbopack configuration plus `transpilePackages` as needed. Production and packed-consumer builds must use built package exports. A reliable managed package watch build is also acceptable if verified. A one-time package build followed by a long-lived app server is not sufficient.

Retain root `pnpm dev` and use port 5173 for the Next app. Only replace a known Lilt listener; never kill an unrelated process to claim the port. Root build compiles charts then the Next app. Vercel target becomes the Next app at `apps/showcase` with a repository-root workspace build and default Next output, not `apps/showcase/dist` or a static export. Document the exact monorepo build setup, but do not deploy.

Source research establishes the shell structure and tokens, not successful integration or measured smoothness. Luna must return working app and motion evidence.
