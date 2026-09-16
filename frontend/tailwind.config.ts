import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Semantic colours. Values live in App.css so every utility follows
      // the active light/dark theme without component-level colour swaps.
      colors: {
        brand: {
          primary: "rgb(var(--brand-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--brand-primary-hover) / <alpha-value>)",
          "primary-soft": "rgb(var(--brand-primary-soft) / <alpha-value>)",
          secondary: "rgb(var(--brand-secondary) / <alpha-value>)",
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
          teal: "rgb(var(--brand-teal) / <alpha-value>)",
        },
        surface: {
          page: "rgb(var(--surface-page) / <alpha-value>)",
          card: "rgb(var(--surface-card) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
          selected: "rgb(var(--surface-selected) / <alpha-value>)",
          inverse: "rgb(var(--surface-inverse) / <alpha-value>)",
        },
        border: {
          subtle: "rgb(var(--border-subtle) / <alpha-value>)",
          DEFAULT: "rgb(var(--border-default) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
          emphasis: "rgb(var(--border-emphasis) / <alpha-value>)",
          focus: "rgb(var(--border-focus) / <alpha-value>)",
        },
        content: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          inverse: "rgb(var(--text-inverse) / <alpha-value>)",
        },
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        // Deep indigo/royal blue primary, teal secondary, amber accent —
        // per the proposal's "modern, colorful, professional university"
        // palette. Slate is used for neutrals via Tailwind's built-ins.
        primary: {
          50: '#eef1ff',
          100: '#e0e4ff',
          200: '#c4caff',
          300: '#a0a6fb',
          400: '#7c7ff2',
          500: '#5b57e6',
          600: '#4740c9',
          700: '#3a34a3',
          800: '#2f2c80',
          900: '#1e1b52',
        },
        teal: {
          500: '#14b8a6',
          600: '#0d9488',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Product typography: each token couples size and line height so text
      // rhythm does not depend on browser defaults.
      fontSize: {
        display: ["3rem", { lineHeight: "3.5rem", fontWeight: "800" }],
        "page-title": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "700" }],
        "section-title": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "700" }],
        "subsection-title": ["1rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75rem" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        "body-sm": ["0.875rem", { lineHeight: "1.25rem" }],
        label: ["0.875rem", { lineHeight: "1.25rem", fontWeight: "600" }],
        caption: ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
        overline: ["0.75rem", { lineHeight: "1rem", fontWeight: "700", letterSpacing: "0.12em" }],
      },
      fontWeight: {
        regular: "400",
        label: "600",
        heading: "700",
        display: "800",
      },
      lineHeight: {
        caption: "1rem",
        compact: "1.25rem",
        body: "1.5rem",
        comfortable: "1.75rem",
      },
      // Named 4px-grid spacing keeps page composition intentional while all
      // legacy numeric Tailwind spacing utilities continue to work.
      spacing: {
        "grid-1": "0.25rem",
        "grid-2": "0.5rem",
        "grid-3": "0.75rem",
        "grid-4": "1rem",
        "grid-5": "1.25rem",
        "grid-6": "1.5rem",
        "grid-8": "2rem",
        "grid-10": "2.5rem",
        "grid-12": "3rem",
        "grid-16": "4rem",
        "grid-20": "5rem",
        "gutter-mobile": "var(--page-gutter-mobile)",
        "gutter-tablet": "var(--page-gutter-tablet)",
        "gutter-desktop": "var(--page-gutter-desktop)",
        "control-sm": "var(--control-height-sm)",
        control: "var(--control-height)",
        "control-lg": "var(--control-height-lg)",
      },
      maxWidth: {
        reading: "var(--container-reading)",
        standard: "var(--container-standard)",
        wide: "var(--container-wide)",
        dashboard: "var(--container-dashboard)",
      },
      minHeight: {
        "control-sm": "var(--control-height-sm)",
        control: "var(--control-height)",
        "control-lg": "var(--control-height-lg)",
        touch: "var(--touch-target-min)",
      },
      minWidth: {
        touch: "var(--touch-target-min)",
      },
      // Semantic radii retain JomDekan's rounded-card identity.
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        feature: "var(--radius-feature)",
        xl: '0.875rem', // Legacy alias retained during migration.
      },
      borderColor: {
        subtle: "rgb(var(--border-subtle) / <alpha-value>)",
        DEFAULT: "rgb(var(--border-default) / <alpha-value>)",
        strong: "rgb(var(--border-strong) / <alpha-value>)",
        focus: "rgb(var(--border-focus) / <alpha-value>)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        popover: "var(--shadow-popover)",
        modal: "var(--shadow-modal)",
        focus: "var(--shadow-focus)",
      },
      // Motion names are shared by Tailwind utilities and CSS primitives.
      transitionDuration: {
        fast: "var(--motion-fast)",
        standard: "var(--motion-standard)",
        panel: "var(--motion-panel)",
        content: "var(--motion-content)",
        promo: "var(--motion-promo)",
      },
      transitionTimingFunction: {
        premium: "var(--ease-premium)",
      },
      keyframes: {
        "content-enter": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "panel-enter": {
          from: { opacity: "0", transform: "translateY(6px) scale(.99)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "content-enter": "content-enter var(--motion-content) var(--ease-premium) both",
        "panel-enter": "panel-enter var(--motion-panel) var(--ease-premium) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
