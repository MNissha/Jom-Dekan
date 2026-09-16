# Final design-system QA

## Scope and method

The frontend was statically scanned for hardcoded colors, arbitrary type/spacing/radii/shadows, motion, fixed light surfaces, fixed dark text, control accessibility, overflow, viewport-constrained overlays, and duplicated UI patterns. TypeScript, ESLint, Vitest, the production build, Playwright E2E, and `git diff --check` were executed.

Interactive browser discovery returned no available browser, so the requested manual screenshot matrix at 375×812, 768×1024, 1280×800, and 1536×960 could not be completed in this environment. The Playwright E2E browser successfully exercised registration, dashboard arrival, and logout. The viewport/theme/state matrix remains a manual release check.

## Issues fixed

- Public user profile cards now use the shared static-card category, semantic surfaces, borders, radii, shadows, spacing, typography, and dark-mode colors.
- The public profile name is now a semantic `h1` and wraps instead of truncating long names.
- University, field of study, tutor biography, and metadata now wrap safely.
- The profile hero uses tokenized radius, spacing, and shadow while retaining its intentional brand gradient and gold tutor identity.
- Navigation, menus, filters, overlays, notifications, dialogs, toasts, banners, cards, tables, forms, controls, loading states, and empty states use the shared conventions established during the migration.
- The E2E registration flow was updated for the current form contract: strong password, confirmation, academic fields, terms acceptance, current dashboard heading, and logout label.

## Token usage coverage

- Core foundations: semantic light/dark colors, typography, 4px spacing, gutters, containers, control heights, radii, borders, shadows, focus, disabled state, durations, and easing are centralized.
- Shared system surfaces have high adoption: application shells, headers, shared cards, forms, notifications, dialogs, empty states, and skeletons use semantic tokens.
- The static scan still finds hardcoded hex values in 48 frontend files. Most are feature illustration gradients, status accents, file-type colors, marketplace identity treatments, charts, and admin hero treatments. They were retained where mechanical replacement would remove meaningful feature semantics.
- Remaining legacy utility usage: arbitrary typography in 23 files, arbitrary radii in 26, arbitrary spacing in 10, custom shadows in 5, numeric duration utilities in 38, fixed `bg-white` in 52, and fixed dark slate text in 57. These counts include legitimate illustration/detail treatments and legacy feature internals, not only defects.

## Shared-component adoption

- Layout: `PageContainer`, `PageHeader`, `SectionHeader`, `ContentStack`, `ResponsiveGrid`, and `SectionCard`.
- Controls: typed `Button`, `IconButton`, input, textarea, select, searchable select, checkbox, radio, labels, help, errors, and field composition.
- Content: typed card categories, headings, metadata, footers, statuses, list surfaces, table containers, skeletons, alerts, and empty states.
- Navigation/overlays: `nav-item`, `filter-chip`, `menu-surface`, `menu-item`, `overlay-root`, and dialog header/body/footer conventions.
- Remaining duplicated class strings are concentrated in marketplace multi-step forms, resource editing/upload forms, and dense admin creation modals. These should migrate incrementally when those features are next changed.

## Dark-mode coverage

- Shared tokens and primitives support dark mode.
- Headers, sidebar shell, cards, controls, notifications, menus, legal/confirmation dialogs, messages, and the public user profile use semantic dark surfaces and text.
- Remaining debt is primarily inside older resource upload/detail forms, marketplace multi-step modal internals, and several dense admin detail/create modals with fixed white/slate utilities.

## Accessibility results

- Shared interactive cards, menus, controls, filters, and navigation provide visible `focus-visible` feedback.
- Icon-only shared controls require accessible names.
- Status indicators include text and optional icons rather than color alone.
- Marketplace clickable articles retain keyboard activation through `role="button"`, `tabIndex`, Enter, and Space handling.
- Dialog names and existing action labels were preserved.
- E2E exposed and resolved stale accessible-name selectors in the authentication flow.
- A dedicated automated axe-style accessibility suite is not currently configured and remains recommended debt.

## Responsive results

- Page gutters and content containers are tokenized across phone, tablet, laptop, and desktop breakpoints.
- Shared cards and dialog bodies guard long content.
- Mobile drawers are viewport-width bounded and overflow-clipped.
- Menus/popovers use viewport-relative maximum dimensions; dialogs use safe-area padding and `100dvh` bounds.
- The four-size manual visual matrix was blocked by unavailable interactive-browser discovery and must be completed before release.

## Test results

- Type-check: passed.
- Vitest: 15 files, 96 tests passed.
- ESLint: 0 errors; 2 existing Fast Refresh warnings in `ThemeContext.tsx` and `ToastContext.tsx`.
- Production build: passed; existing large-chunk advisory remains.
- Playwright E2E: 1 passed.
- `git diff --check`: passed; only line-ending conversion notices were emitted.

## Remaining exceptions and design debt

- Brand gradients, gold accents, file-type colors, chart palettes, and specialized marketplace illustrations intentionally remain feature-specific.
- Marketplace multi-step dialogs preserve their specialized hierarchy and internal actions.
- Resource upload/detail pages still contain the largest concentration of legacy form class strings.
- Dense admin creation/detail modals should be moved to a typed shared dialog composition in a behavior-preserving follow-up.
- Replace remaining legacy fixed light surfaces opportunistically, accompanied by route-level dark-mode regression tests.
- Add automated visual regression snapshots for the four required viewport sizes, both themes, reduced motion, long content, loading, empty, error, and disabled states.
- Split the production bundle with route-level dynamic imports after design QA; this is performance debt rather than a design-system change.
