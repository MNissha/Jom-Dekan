# Navigation and overlay conventions

The shared state classes live in `src/App.css` and use the semantic color, radius, shadow, focus, and motion tokens.

| Convention | Usage |
| --- | --- |
| `nav-item` | Header, sidebar, tab, and breadcrumb controls. Active state is expressed with `aria-current`, `aria-selected`, or `aria-pressed`. |
| `filter-chip` | Compact filters and segmented choices. Keep visible text and expose selection with `aria-pressed` or `aria-selected`. |
| `menu-surface` | Dropdowns and popovers. It is viewport-width constrained, vertically bounded, scrollable, and dark-mode aware. |
| `menu-item` | Enabled, selected, focused, and disabled menu rows. |
| `overlay-root` | Viewport and safe-area constrained modal layer. |
| `overlay-backdrop` | Optional independently clickable backdrop. |
| `dialog-surface` | Flex-column dialog frame with semantic surface, border, radius, shadow, and tokenized entrance motion. |
| `dialog-header` | Non-scrolling dialog heading and close action. |
| `dialog-body` | The only scrolling dialog region; handles long unbroken content. |
| `dialog-footer` | Non-scrolling action region. |

## Examples

```tsx
<button aria-pressed={selected} className="filter-chip px-4">Unread</button>

<div className="overlay-root">
  <button className="overlay-backdrop" onClick={onClose} aria-label="Close dialog" />
  <section role="dialog" aria-modal="true" aria-labelledby="title" className="dialog-surface max-w-xl">
    <header className="dialog-header">...</header>
    <div className="dialog-body">...</div>
    <footer className="dialog-footer">...</footer>
  </section>
</div>
```

Public and dashboard profile menus intentionally retain their different account summaries. Notifications retain unread markers, routing behavior, and the five-item preview. Marketplace multi-step dialogs retain their specialized content hierarchy and internal step actions; the shared modal conventions should be used when those flows are next structurally edited.
