# Buttons and form controls

Shared implementations live in `components/common/ui.tsx` and
`components/common/forms.tsx`; class generators live in `controlStyles.ts` so
navigation links can receive button presentation without changing semantics.

## Buttons

- Variants: `primary`, `secondary`, `accent`, `destructive`, `ghost`, `link`.
- Sizes: `small` (40px), `medium` (44px), and `large` (48px).
- `Button` supports `loading`, `loadingLabel`, `disabled`, refs, and all native
  button attributes. Loading content stays in flow invisibly, preserving width.
- `IconButton` requires an `aria-label` and supports the same sizes, variants,
  loading, disabled, ref, and class override behavior.
- Navigation remains a `Link`; use `buttonClassName(...)` as its `className`.

```tsx
<Button loading={saving} type="submit">Save changes</Button>
<IconButton aria-label="Close" variant="ghost"><X /></IconButton>
<Link to="/resources" className={buttonClassName({ variant: "secondary" })}>Browse</Link>
```

## Forms

- `FormField`, `Label`, `HelpText`, and `ErrorMessage` provide field structure.
- `Input`, `Textarea`, and `Select` share 44px height, semantic borders,
  dark-mode surfaces, focus rings, errors, disabled states, and refs.
- `Input` accepts `prefix`, `suffix`, `containerClassName`, and `className`.
- `Checkbox` and `RadioGroup` provide accessible native selection semantics.
- `SearchableSelect` uses the shared field styling and exposes listbox,
  active-option, selected-option, keyboard, disabled, and invalid semantics.
- `controlClassName(...)` is the compatibility path for registered native
  inputs that cannot yet be replaced without disturbing form wiring.
