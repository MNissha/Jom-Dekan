# JomDekan design-system foundations

This reference describes the shared token layer. Existing `primary`, `teal`,
`amber`, slate, and numeric Tailwind utilities remain available during the
migration; new shared UI should prefer the semantic names below.

## Colours

| Token | Intended use | Example |
| --- | --- | --- |
| `brand-primary`, `brand-primary-hover`, `brand-primary-soft` | Primary actions, selected states, soft brand backgrounds | `bg-brand-primary hover:bg-brand-primary-hover` |
| `brand-secondary` | Deep university purple and inverse brand surfaces | `text-brand-secondary` |
| `brand-accent` | Gold highlights and promotional actions | `bg-brand-accent` |
| `brand-teal` | Supporting identity accents | `text-brand-teal` |
| `surface-page`, `surface-card`, `surface-raised` | Page, card, and elevated overlay backgrounds | `bg-surface-card` |
| `surface-muted`, `surface-selected`, `surface-inverse` | Quiet, selected, and inverse regions | `bg-surface-selected` |
| `content-primary`, `content-secondary`, `content-muted`, `content-inverse` | Text and icons by emphasis | `text-content-secondary` |
| `border-subtle`, `border`, `border-strong`, `border-focus` | Dividers, controls, emphasized boundaries, focus | `border-border-strong` |
| `success`, `warning`, `danger`, `info` | Semantic feedback only | `text-danger` |

All semantic colours are CSS-variable backed and automatically change under
the `.dark` theme class. Feature illustration and data-category colours may
remain local when their hue carries domain meaning.

## Typography

| Utility | Size / line height | Use |
| --- | --- | --- |
| `text-display` | 48 / 56px, weight 800 | Marketing hero only |
| `text-page-title` | 30 / 36px, weight 700 | Route heading; use responsive overrides when needed |
| `text-section-title` | 20 / 28px, weight 700 | Major section heading |
| `text-subsection-title` | 16 / 24px, weight 600 | Card and subsection heading |
| `text-body-lg` | 18 / 28px | Introductory copy |
| `text-body` | 16 / 24px | Default prose |
| `text-body-sm` | 14 / 20px | Compact product UI |
| `text-label` | 14 / 20px, weight 600 | Forms and controls |
| `text-caption` | 12 / 16px, weight 500 | Metadata |
| `text-overline` | 12 / 16px, weight 700, tracked | Eyebrows and grouping labels |

Named weights are `font-regular`, `font-label`, `font-heading`, and
`font-display`. Named line heights are `leading-caption`, `leading-compact`,
`leading-body`, and `leading-comfortable`.

## Spacing and layout

The named grid follows 4px increments: `grid-1`, `grid-2`, `grid-3`, `grid-4`,
`grid-5`, `grid-6`, `grid-8`, `grid-10`, `grid-12`, `grid-16`, and `grid-20`.
For example, `gap-grid-4 p-grid-6` gives a 16px gap and 24px padding.

- Page gutters: `px-gutter-mobile sm:px-gutter-tablet lg:px-gutter-desktop`
- Reading content: `max-w-reading` (768px)
- Standard pages: `max-w-standard` (1152px)
- Wide/admin pages: `max-w-wide` (1280px)
- Dashboard overview: `max-w-dashboard` (1440px)

## Controls, shape, and elevation

- Heights: `h-control-sm` 36px, `h-control` 44px, `h-control-lg` 48px.
- Touch minimum: `min-h-touch min-w-touch` (44px).
- Radii: `rounded-control` 12px, `rounded-card` 16px,
  `rounded-feature` 20px, and `rounded-full` for intentional pills.
- Shadows: `shadow-card`, `shadow-raised`, `shadow-popover`, `shadow-modal`,
  and `shadow-focus`.
- Disabled native controls receive a consistent cursor, opacity, and removal
  of press transforms. Components remain responsible for `disabled`,
  `aria-disabled`, and preventing interaction.
- The global `:focus-visible` rule supplies the baseline focus outline;
  components should not remove it unless they provide an equivalent visible
  semantic focus treatment.

## Motion

| Utility | Duration | Use |
| --- | ---: | --- |
| `duration-fast` | 160ms | Press and micro-feedback |
| `duration-standard` | 200ms | Normal control transitions |
| `duration-panel` | 240ms | Popovers and panels |
| `duration-content` | 320ms | Page/content entrance |
| `duration-promo` | 500ms | Promotional moments only |

Use `ease-premium` for shared UI. `animate-content-enter` and
`animate-panel-enter` consume the same timing tokens. The global
`prefers-reduced-motion` rule reduces animations and transitions to near-zero,
so new animation utilities must remain inside the existing motion system.

## Shared-surface example

```tsx
<section className="rounded-card border border-border bg-surface-card p-grid-6 text-content-primary shadow-card">
  <h2 className="text-section-title">Section title</h2>
  <p className="mt-grid-2 text-body-sm text-content-secondary">Supporting copy.</p>
  <button className="mt-grid-6 min-h-control rounded-control bg-brand-primary px-grid-4 text-label text-content-inverse transition duration-standard ease-premium hover:bg-brand-primary-hover disabled:cursor-not-allowed">
    Continue
  </button>
</section>
```
