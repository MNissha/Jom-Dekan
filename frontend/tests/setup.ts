import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia at all (not even a stub) — several
// components call it unconditionally (ResourceAgentPanel's desktop/mobile
// breakpoint check, DashboardLayout's sidebar-collapse-vs-drawer check).
// Default to `matches: false` ("mobile"/narrow) so tests are deterministic
// unless a test explicitly overrides it to exercise desktop behavior.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
