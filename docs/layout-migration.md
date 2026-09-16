# Frontend layout migration audit

All routes declared in `frontend/src/App.tsx` were reviewed after the shared
page-shell migration. Route content now follows one responsive gutter contract:
16px on phones, 24px on tablets, and 32px on laptop/desktop viewports.

## Width assignments

- **Reading (768px):** resource detail, forum-post detail, user profile, help,
  not-found, and their loading/error states.
- **Standard (1152px):** resources, upload, favourites, forum, profile,
  notifications, marketplace, and standalone admin management routes.
- **Wide (1280px):** the taxonomy administration layout and its tables.
- **Dashboard (1440px):** dashboard overview plus public/authenticated headers.
- **Focused forms:** login, registration, password recovery/reset, and email
  verification keep narrower `max-w-md`/`max-w-4xl` form measures while using
  the same responsive gutters.

## Intentional layout exceptions

- **Messages:** retains its full-height split conversation layout; only its
  responsive outer gutters and heading type were standardized.
- **Marketplace tutoring/freelance:** retain domain-specific flexible columns,
  modal bodies, listing cards, and detail panes inside the standard page shell.
- **Resource detail:** retains a reading-width document layout and attached AI
  agent panel instead of adopting a product grid.
- **Dashboard:** retains a 1440px multi-column overview rather than the standard
  application width.
- **Admin tables:** retain horizontal scrolling and table-specific fixed/minmax
  columns; the containing administration shell and heading hierarchy are shared.
- **Marketing visual mockups:** intentionally small labels and bespoke spacing
  inside non-interactive illustrations remain page-specific. Marketing section
  headings, body text, gutters, and outer spacing use shared tokens.
- **Navigation sidebars and headers:** retain fixed-shell dimensions required by
  collapse/drawer behavior, while their horizontal gutters align with pages.

Long content is handled through `min-w-0`, wrapping headings/descriptions,
truncated compact list rows with full detail views, scrollable tables, and the
`overflow-wrap-anywhere` utility used by shared cards.
