# Cards, status, and state surfaces

Use `cardClassName(category, className)` or the typed helpers in `src/components/common/cards.tsx`. The category owns surface, border, radius, padding, shadow, focus, and motion; feature classes should only describe internal layout.

| Category | Intended usage | Interaction |
| --- | --- | --- |
| `static` | General content and empty states | No lift or clickable treatment |
| `interactive` | Generic navigation/action surface | Border and shadow feedback; shared focus ring |
| `stat` | Dashboard metric | Static |
| `resource` | Resource grid/list navigation | Interactive; preserves resource metadata layout |
| `forum-post` | Forum-list navigation | Interactive |
| `comment` | Forum comment content | Static |
| `tutor` | Tutor discovery card | Interactive; preserves tutor hierarchy |
| `opportunity` | Marketplace opportunity | Interactive; preserves listing hierarchy |
| `conversation` | Dense message-thread selector | Interactive, flat, selected background remains feature-owned |
| `booking` | Booking request details | Static; actions remain separate controls |
| `admin-summary` | Administrative metric | Static |
| `admin-table` | Scroll-safe table frame | Static; rows use background/inset-border feedback, never movement |

## Supporting primitives

- `CardHeading`, `CardMeta`, and `CardFooter` provide consistent hierarchy and spacing.
- `StatusIndicator` always renders readable text and may add an icon; tones are `neutral`, `success`, `warning`, `danger`, and `info` in both themes.
- `ListSurface` provides a bordered, divided list container.
- `TableContainer` provides horizontal scrolling and stable administrative row behavior.
- `SkeletonBlock` uses semantic surfaces, disables animation under reduced motion, and should sit inside a shape-matched card.
- `Alert` supplies semantic success, warning, danger, and information treatments. Danger alerts use `role="alert"`; other tones use `role="status"`.
- `EmptyState` is a static card with a title, explanation, and optional semantic link actions.

## Examples

```tsx
<Link to={`/resources/${id}`} className={cardClassName("resource", "flex flex-col")}>
  ...
</Link>

<StatusIndicator tone="success" icon={CheckCircle}>Approved</StatusIndicator>

<TableContainer>
  <table>...</table>
</TableContainer>
```

Feature-specific illustration colors, marketplace detail ordering, booking data, and message selected states intentionally remain local. Entrance animation is allowed for short card collections; administrative table rows never animate individually.
