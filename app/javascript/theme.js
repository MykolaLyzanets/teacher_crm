const STORAGE_KEY = "danlio-appearance"

const STYLES = {
  vega: { radius: "0.3rem" },
  nova: { radius: "0.625rem" },
  maia: { radius: "0.75rem" },
  lyra: { radius: "0.4rem" },
  mira: { radius: "1rem" },
  luma: { radius: "0.15rem" },
  sera: { radius: "1.4rem" },
  rhea: { radius: "0.5rem" }
}

const PALETTES = {
  neutral: {
    dark: {
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.205 0 0)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.205 0 0)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.922 0 0)",
      "primary-foreground": "oklch(0.205 0 0)",
      secondary: "oklch(0.269 0 0)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.269 0 0)",
      "muted-foreground": "oklch(0.708 0 0)",
      accent: "oklch(0.269 0 0)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.556 0 0)",
      "chart-1": "oklch(0.488 0.243 264.376)",
      "chart-2": "oklch(0.696 0.17 162.48)",
      "chart-3": "oklch(0.769 0.188 70.08)",
      "chart-4": "oklch(0.627 0.265 303.9)",
      "chart-5": "oklch(0.645 0.246 16.439)",
      sidebar: "oklch(0.205 0 0)",
      "sidebar-foreground": "oklch(0.985 0 0)",
      "sidebar-primary": "oklch(0.922 0 0)",
      "sidebar-accent": "oklch(0.269 0 0)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      swatch: "oklch(0.708 0 0)"
    },
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.145 0 0)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.145 0 0)",
      primary: "oklch(0.205 0 0)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.97 0 0)",
      "secondary-foreground": "oklch(0.205 0 0)",
      muted: "oklch(0.97 0 0)",
      "muted-foreground": "oklch(0.556 0 0)",
      accent: "oklch(0.97 0 0)",
      "accent-foreground": "oklch(0.205 0 0)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.922 0 0)",
      input: "oklch(0.922 0 0)",
      ring: "oklch(0.708 0 0)",
      "chart-1": "oklch(0.87 0 0)",
      "chart-2": "oklch(0.556 0 0)",
      "chart-3": "oklch(0.439 0 0)",
      "chart-4": "oklch(0.371 0 0)",
      "chart-5": "oklch(0.269 0 0)",
      sidebar: "oklch(0.985 0 0)",
      "sidebar-foreground": "oklch(0.145 0 0)",
      "sidebar-primary": "oklch(0.205 0 0)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-accent": "oklch(0.97 0 0)",
      "sidebar-accent-foreground": "oklch(0.205 0 0)",
      "sidebar-border": "oklch(0.922 0 0)",
      "sidebar-ring": "oklch(0.708 0 0)",
      swatch: "oklch(0.556 0 0)"
    }
  },
  stone: {
    dark: {
      background: "oklch(0.147 0.004 49.25)",
      foreground: "oklch(0.985 0.001 106.423)",
      card: "oklch(0.216 0.006 56.043)",
      "card-foreground": "oklch(0.985 0.001 106.423)",
      popover: "oklch(0.216 0.006 56.043)",
      "popover-foreground": "oklch(0.985 0.001 106.423)",
      primary: "oklch(0.923 0.003 48.717)",
      "primary-foreground": "oklch(0.216 0.006 56.043)",
      secondary: "oklch(0.268 0.007 34.298)",
      "secondary-foreground": "oklch(0.985 0.001 106.423)",
      muted: "oklch(0.268 0.007 34.298)",
      "muted-foreground": "oklch(0.709 0.01 56.259)",
      accent: "oklch(0.268 0.007 34.298)",
      "accent-foreground": "oklch(0.985 0.001 106.423)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.553 0.013 58.071)",
      "chart-1": "oklch(0.869 0.005 56.366)",
      "chart-2": "oklch(0.553 0.013 58.071)",
      "chart-3": "oklch(0.444 0.011 73.639)",
      "chart-4": "oklch(0.374 0.01 67.558)",
      "chart-5": "oklch(0.268 0.007 34.298)",
      sidebar: "oklch(0.216 0.006 56.043)",
      "sidebar-foreground": "oklch(0.985 0.001 106.423)",
      "sidebar-primary": "oklch(0.923 0.003 48.717)",
      "sidebar-accent": "oklch(0.268 0.007 34.298)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      swatch: "oklch(0.709 0.01 56.259)"
    },
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.147 0.004 49.25)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.147 0.004 49.25)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.147 0.004 49.25)",
      primary: "oklch(0.216 0.006 56.043)",
      "primary-foreground": "oklch(0.985 0.001 106.423)",
      secondary: "oklch(0.97 0.001 106.424)",
      "secondary-foreground": "oklch(0.216 0.006 56.043)",
      muted: "oklch(0.97 0.001 106.424)",
      "muted-foreground": "oklch(0.553 0.013 58.071)",
      accent: "oklch(0.97 0.001 106.424)",
      "accent-foreground": "oklch(0.216 0.006 56.043)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.923 0.003 48.717)",
      input: "oklch(0.923 0.003 48.717)",
      ring: "oklch(0.709 0.01 56.259)",
      "chart-1": "oklch(0.869 0.005 56.366)",
      "chart-2": "oklch(0.553 0.013 58.071)",
      "chart-3": "oklch(0.444 0.011 73.639)",
      "chart-4": "oklch(0.374 0.01 67.558)",
      "chart-5": "oklch(0.268 0.007 34.298)",
      sidebar: "oklch(0.985 0.001 106.423)",
      "sidebar-foreground": "oklch(0.147 0.004 49.25)",
      "sidebar-primary": "oklch(0.216 0.006 56.043)",
      "sidebar-primary-foreground": "oklch(0.985 0.001 106.423)",
      "sidebar-accent": "oklch(0.97 0.001 106.424)",
      "sidebar-accent-foreground": "oklch(0.216 0.006 56.043)",
      "sidebar-border": "oklch(0.923 0.003 48.717)",
      "sidebar-ring": "oklch(0.709 0.01 56.259)",
      swatch: "oklch(0.553 0.013 58.071)"
    }
  },
  zinc: {
    dark: {
      background: "oklch(0.141 0.005 285.823)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.21 0.006 285.885)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.21 0.006 285.885)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.92 0.004 286.32)",
      "primary-foreground": "oklch(0.21 0.006 285.885)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.274 0.006 286.033)",
      "muted-foreground": "oklch(0.705 0.015 286.067)",
      accent: "oklch(0.274 0.006 286.033)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.552 0.016 285.938)",
      "chart-1": "oklch(0.871 0.006 286.286)",
      "chart-2": "oklch(0.552 0.016 285.938)",
      "chart-3": "oklch(0.442 0.017 285.786)",
      "chart-4": "oklch(0.37 0.013 285.805)",
      "chart-5": "oklch(0.274 0.006 286.033)",
      sidebar: "oklch(0.21 0.006 285.885)",
      "sidebar-foreground": "oklch(0.985 0 0)",
      "sidebar-primary": "oklch(0.92 0.004 286.32)",
      "sidebar-accent": "oklch(0.274 0.006 286.033)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      swatch: "oklch(0.705 0.015 286.067)"
    },
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.141 0.005 285.823)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.141 0.005 285.823)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.141 0.005 285.823)",
      primary: "oklch(0.21 0.006 285.885)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      muted: "oklch(0.967 0.001 286.375)",
      "muted-foreground": "oklch(0.552 0.016 285.938)",
      accent: "oklch(0.967 0.001 286.375)",
      "accent-foreground": "oklch(0.21 0.006 285.885)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.92 0.004 286.32)",
      input: "oklch(0.92 0.004 286.32)",
      ring: "oklch(0.705 0.015 286.067)",
      "chart-1": "oklch(0.871 0.006 286.286)",
      "chart-2": "oklch(0.552 0.016 285.938)",
      "chart-3": "oklch(0.442 0.017 285.786)",
      "chart-4": "oklch(0.37 0.013 285.805)",
      "chart-5": "oklch(0.274 0.006 286.033)",
      sidebar: "oklch(0.985 0 0)",
      "sidebar-foreground": "oklch(0.141 0.005 285.823)",
      "sidebar-primary": "oklch(0.21 0.006 285.885)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-accent": "oklch(0.967 0.001 286.375)",
      "sidebar-accent-foreground": "oklch(0.21 0.006 285.885)",
      "sidebar-border": "oklch(0.92 0.004 286.32)",
      "sidebar-ring": "oklch(0.705 0.015 286.067)",
      swatch: "oklch(0.552 0.016 285.938)"
    }
  },
  mauve: {
    dark: {
      background: "oklch(0.145 0.008 326)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.212 0.019 322.12)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.212 0.019 322.12)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.922 0.005 325.62)",
      "primary-foreground": "oklch(0.212 0.019 322.12)",
      secondary: "oklch(0.263 0.024 320.12)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.263 0.024 320.12)",
      "muted-foreground": "oklch(0.711 0.019 323.02)",
      accent: "oklch(0.263 0.024 320.12)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.542 0.034 322.5)",
      "chart-1": "oklch(0.865 0.012 325.68)",
      "chart-2": "oklch(0.542 0.034 322.5)",
      "chart-3": "oklch(0.435 0.029 321.78)",
      "chart-4": "oklch(0.364 0.029 323.89)",
      "chart-5": "oklch(0.263 0.024 320.12)",
      sidebar: "oklch(0.212 0.019 322.12)",
      "sidebar-foreground": "oklch(0.985 0 0)",
      "sidebar-primary": "oklch(0.922 0.005 325.62)",
      "sidebar-accent": "oklch(0.263 0.024 320.12)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      swatch: "oklch(0.711 0.019 323.02)"
    },
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0.008 326)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.145 0.008 326)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.145 0.008 326)",
      primary: "oklch(0.212 0.019 322.12)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.96 0.003 325.6)",
      "secondary-foreground": "oklch(0.212 0.019 322.12)",
      muted: "oklch(0.96 0.003 325.6)",
      "muted-foreground": "oklch(0.542 0.034 322.5)",
      accent: "oklch(0.96 0.003 325.6)",
      "accent-foreground": "oklch(0.212 0.019 322.12)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.922 0.005 325.62)",
      input: "oklch(0.922 0.005 325.62)",
      ring: "oklch(0.711 0.019 323.02)",
      "chart-1": "oklch(0.865 0.012 325.68)",
      "chart-2": "oklch(0.542 0.034 322.5)",
      "chart-3": "oklch(0.435 0.029 321.78)",
      "chart-4": "oklch(0.364 0.029 323.89)",
      "chart-5": "oklch(0.263 0.024 320.12)",
      sidebar: "oklch(0.985 0 0)",
      "sidebar-foreground": "oklch(0.145 0.008 326)",
      "sidebar-primary": "oklch(0.212 0.019 322.12)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-accent": "oklch(0.96 0.003 325.6)",
      "sidebar-accent-foreground": "oklch(0.212 0.019 322.12)",
      "sidebar-border": "oklch(0.922 0.005 325.62)",
      "sidebar-ring": "oklch(0.711 0.019 323.02)",
      swatch: "oklch(0.542 0.034 322.5)"
    }
  },
  olive: {
    dark: {
      background: "oklch(0.153 0.006 107.1)",
      foreground: "oklch(0.988 0.003 106.5)",
      card: "oklch(0.228 0.013 107.4)",
      "card-foreground": "oklch(0.988 0.003 106.5)",
      popover: "oklch(0.228 0.013 107.4)",
      "popover-foreground": "oklch(0.988 0.003 106.5)",
      primary: "oklch(0.93 0.007 106.5)",
      "primary-foreground": "oklch(0.228 0.013 107.4)",
      secondary: "oklch(0.286 0.016 107.4)",
      "secondary-foreground": "oklch(0.988 0.003 106.5)",
      muted: "oklch(0.286 0.016 107.4)",
      "muted-foreground": "oklch(0.737 0.021 106.9)",
      accent: "oklch(0.286 0.016 107.4)",
      "accent-foreground": "oklch(0.988 0.003 106.5)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.58 0.031 107.3)",
      "chart-1": "oklch(0.88 0.011 106.6)",
      "chart-2": "oklch(0.58 0.031 107.3)",
      "chart-3": "oklch(0.466 0.025 107.3)",
      "chart-4": "oklch(0.394 0.023 107.4)",
      "chart-5": "oklch(0.286 0.016 107.4)",
      sidebar: "oklch(0.228 0.013 107.4)",
      "sidebar-foreground": "oklch(0.988 0.003 106.5)",
      "sidebar-primary": "oklch(0.93 0.007 106.5)",
      "sidebar-accent": "oklch(0.286 0.016 107.4)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      swatch: "oklch(0.737 0.021 106.9)"
    },
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.153 0.006 107.1)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.153 0.006 107.1)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.153 0.006 107.1)",
      primary: "oklch(0.228 0.013 107.4)",
      "primary-foreground": "oklch(0.988 0.003 106.5)",
      secondary: "oklch(0.966 0.005 106.5)",
      "secondary-foreground": "oklch(0.228 0.013 107.4)",
      muted: "oklch(0.966 0.005 106.5)",
      "muted-foreground": "oklch(0.58 0.031 107.3)",
      accent: "oklch(0.966 0.005 106.5)",
      "accent-foreground": "oklch(0.228 0.013 107.4)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.93 0.007 106.5)",
      input: "oklch(0.93 0.007 106.5)",
      ring: "oklch(0.737 0.021 106.9)",
      "chart-1": "oklch(0.88 0.011 106.6)",
      "chart-2": "oklch(0.58 0.031 107.3)",
      "chart-3": "oklch(0.466 0.025 107.3)",
      "chart-4": "oklch(0.394 0.023 107.4)",
      "chart-5": "oklch(0.286 0.016 107.4)",
      sidebar: "oklch(0.988 0.003 106.5)",
      "sidebar-foreground": "oklch(0.153 0.006 107.1)",
      "sidebar-primary": "oklch(0.228 0.013 107.4)",
      "sidebar-primary-foreground": "oklch(0.988 0.003 106.5)",
      "sidebar-accent": "oklch(0.966 0.005 106.5)",
      "sidebar-accent-foreground": "oklch(0.228 0.013 107.4)",
      "sidebar-border": "oklch(0.93 0.007 106.5)",
      "sidebar-ring": "oklch(0.737 0.021 106.9)",
      swatch: "oklch(0.58 0.031 107.3)"
    }
  },
  mist: {
    dark: {
      background: "oklch(0.148 0.004 228.8)",
      foreground: "oklch(0.987 0.002 197.1)",
      card: "oklch(0.218 0.008 223.9)",
      "card-foreground": "oklch(0.987 0.002 197.1)",
      popover: "oklch(0.218 0.008 223.9)",
      "popover-foreground": "oklch(0.987 0.002 197.1)",
      primary: "oklch(0.925 0.005 214.3)",
      "primary-foreground": "oklch(0.218 0.008 223.9)",
      secondary: "oklch(0.275 0.011 216.9)",
      "secondary-foreground": "oklch(0.987 0.002 197.1)",
      muted: "oklch(0.275 0.011 216.9)",
      "muted-foreground": "oklch(0.723 0.014 214.4)",
      accent: "oklch(0.275 0.011 216.9)",
      "accent-foreground": "oklch(0.987 0.002 197.1)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.56 0.021 213.5)",
      "chart-1": "oklch(0.872 0.007 219.6)",
      "chart-2": "oklch(0.56 0.021 213.5)",
      "chart-3": "oklch(0.45 0.017 213.2)",
      "chart-4": "oklch(0.378 0.015 216)",
      "chart-5": "oklch(0.275 0.011 216.9)",
      sidebar: "oklch(0.218 0.008 223.9)",
      "sidebar-foreground": "oklch(0.987 0.002 197.1)",
      "sidebar-primary": "oklch(0.925 0.005 214.3)",
      "sidebar-accent": "oklch(0.275 0.011 216.9)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      swatch: "oklch(0.723 0.014 214.4)"
    },
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.148 0.004 228.8)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.148 0.004 228.8)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.148 0.004 228.8)",
      primary: "oklch(0.218 0.008 223.9)",
      "primary-foreground": "oklch(0.987 0.002 197.1)",
      secondary: "oklch(0.963 0.002 197.1)",
      "secondary-foreground": "oklch(0.218 0.008 223.9)",
      muted: "oklch(0.963 0.002 197.1)",
      "muted-foreground": "oklch(0.56 0.021 213.5)",
      accent: "oklch(0.963 0.002 197.1)",
      "accent-foreground": "oklch(0.218 0.008 223.9)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.925 0.005 214.3)",
      input: "oklch(0.925 0.005 214.3)",
      ring: "oklch(0.723 0.014 214.4)",
      "chart-1": "oklch(0.872 0.007 219.6)",
      "chart-2": "oklch(0.56 0.021 213.5)",
      "chart-3": "oklch(0.45 0.017 213.2)",
      "chart-4": "oklch(0.378 0.015 216)",
      "chart-5": "oklch(0.275 0.011 216.9)",
      sidebar: "oklch(0.987 0.002 197.1)",
      "sidebar-foreground": "oklch(0.148 0.004 228.8)",
      "sidebar-primary": "oklch(0.218 0.008 223.9)",
      "sidebar-primary-foreground": "oklch(0.987 0.002 197.1)",
      "sidebar-accent": "oklch(0.963 0.002 197.1)",
      "sidebar-accent-foreground": "oklch(0.218 0.008 223.9)",
      "sidebar-border": "oklch(0.925 0.005 214.3)",
      "sidebar-ring": "oklch(0.723 0.014 214.4)",
      swatch: "oklch(0.56 0.021 213.5)"
    }
  },
  taupe: {
    dark: {
      background: "oklch(0.147 0.004 49.3)",
      foreground: "oklch(0.986 0.002 67.8)",
      card: "oklch(0.214 0.009 43.1)",
      "card-foreground": "oklch(0.986 0.002 67.8)",
      popover: "oklch(0.214 0.009 43.1)",
      "popover-foreground": "oklch(0.986 0.002 67.8)",
      primary: "oklch(0.922 0.005 34.3)",
      "primary-foreground": "oklch(0.214 0.009 43.1)",
      secondary: "oklch(0.268 0.011 36.5)",
      "secondary-foreground": "oklch(0.986 0.002 67.8)",
      muted: "oklch(0.268 0.011 36.5)",
      "muted-foreground": "oklch(0.714 0.014 41.2)",
      accent: "oklch(0.268 0.011 36.5)",
      "accent-foreground": "oklch(0.986 0.002 67.8)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.547 0.021 43.1)",
      "chart-1": "oklch(0.868 0.007 39.5)",
      "chart-2": "oklch(0.547 0.021 43.1)",
      "chart-3": "oklch(0.438 0.017 39.3)",
      "chart-4": "oklch(0.367 0.016 35.7)",
      "chart-5": "oklch(0.268 0.011 36.5)",
      sidebar: "oklch(0.214 0.009 43.1)",
      "sidebar-foreground": "oklch(0.986 0.002 67.8)",
      "sidebar-primary": "oklch(0.922 0.005 34.3)",
      "sidebar-accent": "oklch(0.268 0.011 36.5)",
      "sidebar-border": "oklch(1 0 0 / 10%)",
      swatch: "oklch(0.714 0.014 41.2)"
    },
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.147 0.004 49.3)",
      card: "oklch(1 0 0)",
      "card-foreground": "oklch(0.147 0.004 49.3)",
      popover: "oklch(1 0 0)",
      "popover-foreground": "oklch(0.147 0.004 49.3)",
      primary: "oklch(0.214 0.009 43.1)",
      "primary-foreground": "oklch(0.986 0.002 67.8)",
      secondary: "oklch(0.96 0.002 17.2)",
      "secondary-foreground": "oklch(0.214 0.009 43.1)",
      muted: "oklch(0.96 0.002 17.2)",
      "muted-foreground": "oklch(0.547 0.021 43.1)",
      accent: "oklch(0.96 0.002 17.2)",
      "accent-foreground": "oklch(0.214 0.009 43.1)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.922 0.005 34.3)",
      input: "oklch(0.922 0.005 34.3)",
      ring: "oklch(0.714 0.014 41.2)",
      "chart-1": "oklch(0.868 0.007 39.5)",
      "chart-2": "oklch(0.547 0.021 43.1)",
      "chart-3": "oklch(0.438 0.017 39.3)",
      "chart-4": "oklch(0.367 0.016 35.7)",
      "chart-5": "oklch(0.268 0.011 36.5)",
      sidebar: "oklch(0.986 0.002 67.8)",
      "sidebar-foreground": "oklch(0.147 0.004 49.3)",
      "sidebar-primary": "oklch(0.214 0.009 43.1)",
      "sidebar-primary-foreground": "oklch(0.986 0.002 67.8)",
      "sidebar-accent": "oklch(0.96 0.002 17.2)",
      "sidebar-accent-foreground": "oklch(0.214 0.009 43.1)",
      "sidebar-border": "oklch(0.922 0.005 34.3)",
      "sidebar-ring": "oklch(0.714 0.014 41.2)",
      swatch: "oklch(0.547 0.021 43.1)"
    }
  },
  original: {
    dark: {
      background: "#2c3224",
      foreground: "#f4f5ef",
      card: "#3a4330",
      "card-foreground": "#f4f5ef",
      popover: "#3a4330",
      "popover-foreground": "#f4f5ef",
      primary: "#c5ccb6",
      "primary-foreground": "#2c3224",
      secondary: "#4c563c",
      "secondary-foreground": "#f4f5ef",
      muted: "#4c563c",
      "muted-foreground": "#c5ccb6",
      accent: "#4c563c",
      "accent-foreground": "#f4f5ef",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "rgba(244, 245, 239, 0.12)",
      input: "rgba(244, 245, 239, 0.16)",
      ring: "#66734a",
      "chart-1": "#c5ccb6",
      "chart-2": "#66734a",
      "chart-3": "#8a946c",
      "chart-4": "#414b32",
      "chart-5": "#e8ecdf",
      sidebar: "#3a4330",
      "sidebar-foreground": "#f4f5ef",
      "sidebar-primary": "#c5ccb6",
      "sidebar-accent": "#4c563c",
      "sidebar-border": "rgba(244, 245, 239, 0.12)",
      swatch: "#66734a"
    },
    light: {
      background: "#faf9f5",
      foreground: "#20231d",
      card: "#ffffff",
      "card-foreground": "#20231d",
      popover: "#ffffff",
      "popover-foreground": "#20231d",
      primary: "#66734a",
      "primary-foreground": "#ffffff",
      secondary: "#e8ecdf",
      "secondary-foreground": "#414b32",
      muted: "#fdfdfb",
      "muted-foreground": "#70756b",
      accent: "#e8ecdf",
      "accent-foreground": "#414b32",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "#e1e4da",
      input: "#e1e4da",
      ring: "#66734a",
      "chart-1": "#66734a",
      "chart-2": "#8a946c",
      "chart-3": "#414b32",
      "chart-4": "#c5ccb6",
      "chart-5": "#46512f",
      sidebar: "#ffffff",
      "sidebar-foreground": "#20231d",
      "sidebar-primary": "#66734a",
      "sidebar-primary-foreground": "#ffffff",
      "sidebar-accent": "#e8ecdf",
      "sidebar-accent-foreground": "#414b32",
      "sidebar-border": "#ecefe6",
      "sidebar-ring": "#66734a",
      swatch: "#66734a"
    }
  }
}

const OLD_MODES = { dark: "dark", light: "light", classic: "light", sage: "light", sand: "light", mist: "light", blush: "light", forest: "dark" }

const BACKGROUNDS = {
  dark: { mode: "dark", swatch: "oklch(0.145 0 0)", background: "oklch(0.145 0 0)" },
  light: { mode: "light", swatch: "oklch(1 0 0)", background: "oklch(1 0 0)" },
  classic: { mode: "light", swatch: "#faf9f5", background: "#faf9f5" },
  sage: { mode: "light", swatch: "#e8ecdf", background: "#e8ecdf" },
  sand: { mode: "light", swatch: "#f4efe6", background: "#f4efe6" },
  mist: { mode: "light", swatch: "#eef3f6", background: "#eef3f6" },
  blush: { mode: "light", swatch: "#f6eee9", background: "#f6eee9" },
  forest: { mode: "dark", swatch: "#414b32", background: "#414b32" }
}

const THEMES = {
  amber: {
    light: {
      primary: "oklch(0.555 0.163 48.998)",
      "primary-foreground": "oklch(0.987 0.022 95.277)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.879 0.169 91.605)",
      "chart-2": "oklch(0.769 0.188 70.08)",
      "chart-3": "oklch(0.666 0.179 58.318)",
      "chart-4": "oklch(0.555 0.163 48.998)",
      "chart-5": "oklch(0.473 0.137 46.201)",
      "sidebar-primary": "oklch(0.666 0.179 58.318)",
      "sidebar-primary-foreground": "oklch(0.987 0.022 95.277)"
    },
    dark: {
      primary: "oklch(0.473 0.137 46.201)",
      "primary-foreground": "oklch(0.987 0.022 95.277)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.879 0.169 91.605)",
      "chart-2": "oklch(0.769 0.188 70.08)",
      "chart-3": "oklch(0.666 0.179 58.318)",
      "chart-4": "oklch(0.555 0.163 48.998)",
      "chart-5": "oklch(0.473 0.137 46.201)",
      "sidebar-primary": "oklch(0.769 0.188 70.08)",
      "sidebar-primary-foreground": "oklch(0.279 0.077 45.635)"
    },
    swatch: "oklch(0.555 0.163 48.998)"
  },
  blue: {
    light: {
      primary: "oklch(0.488 0.243 264.376)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.809 0.105 251.813)",
      "chart-2": "oklch(0.623 0.214 259.815)",
      "chart-3": "oklch(0.546 0.245 262.881)",
      "chart-4": "oklch(0.488 0.243 264.376)",
      "chart-5": "oklch(0.424 0.199 265.638)",
      "sidebar-primary": "oklch(0.546 0.245 262.881)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)"
    },
    dark: {
      primary: "oklch(0.424 0.199 265.638)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.809 0.105 251.813)",
      "chart-2": "oklch(0.623 0.214 259.815)",
      "chart-3": "oklch(0.546 0.245 262.881)",
      "chart-4": "oklch(0.488 0.243 264.376)",
      "chart-5": "oklch(0.424 0.199 265.638)",
      "sidebar-primary": "oklch(0.623 0.214 259.815)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)"
    },
    swatch: "oklch(0.488 0.243 264.376)"
  },
  cyan: {
    light: {
      primary: "oklch(0.52 0.105 223.128)",
      "primary-foreground": "oklch(0.984 0.019 200.873)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.865 0.127 207.078)",
      "chart-2": "oklch(0.715 0.143 215.221)",
      "chart-3": "oklch(0.609 0.126 221.723)",
      "chart-4": "oklch(0.52 0.105 223.128)",
      "chart-5": "oklch(0.45 0.085 224.283)",
      "sidebar-primary": "oklch(0.609 0.126 221.723)",
      "sidebar-primary-foreground": "oklch(0.984 0.019 200.873)"
    },
    dark: {
      primary: "oklch(0.45 0.085 224.283)",
      "primary-foreground": "oklch(0.984 0.019 200.873)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.865 0.127 207.078)",
      "chart-2": "oklch(0.715 0.143 215.221)",
      "chart-3": "oklch(0.609 0.126 221.723)",
      "chart-4": "oklch(0.52 0.105 223.128)",
      "chart-5": "oklch(0.45 0.085 224.283)",
      "sidebar-primary": "oklch(0.715 0.143 215.221)",
      "sidebar-primary-foreground": "oklch(0.302 0.056 229.695)"
    },
    swatch: "oklch(0.52 0.105 223.128)"
  },
  emerald: {
    light: {
      primary: "oklch(0.508 0.118 165.612)",
      "primary-foreground": "oklch(0.979 0.021 166.113)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.845 0.143 164.978)",
      "chart-2": "oklch(0.696 0.17 162.48)",
      "chart-3": "oklch(0.596 0.145 163.225)",
      "chart-4": "oklch(0.508 0.118 165.612)",
      "chart-5": "oklch(0.432 0.095 166.913)",
      "sidebar-primary": "oklch(0.596 0.145 163.225)",
      "sidebar-primary-foreground": "oklch(0.979 0.021 166.113)"
    },
    dark: {
      primary: "oklch(0.432 0.095 166.913)",
      "primary-foreground": "oklch(0.979 0.021 166.113)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.845 0.143 164.978)",
      "chart-2": "oklch(0.696 0.17 162.48)",
      "chart-3": "oklch(0.596 0.145 163.225)",
      "chart-4": "oklch(0.508 0.118 165.612)",
      "chart-5": "oklch(0.432 0.095 166.913)",
      "sidebar-primary": "oklch(0.696 0.17 162.48)",
      "sidebar-primary-foreground": "oklch(0.262 0.051 172.552)"
    },
    swatch: "oklch(0.508 0.118 165.612)"
  },
  fuchsia: {
    light: {
      primary: "oklch(0.518 0.253 323.949)",
      "primary-foreground": "oklch(0.977 0.017 320.058)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.833 0.145 321.434)",
      "chart-2": "oklch(0.667 0.295 322.15)",
      "chart-3": "oklch(0.591 0.293 322.896)",
      "chart-4": "oklch(0.518 0.253 323.949)",
      "chart-5": "oklch(0.452 0.211 324.591)",
      "sidebar-primary": "oklch(0.591 0.293 322.896)",
      "sidebar-primary-foreground": "oklch(0.977 0.017 320.058)"
    },
    dark: {
      primary: "oklch(0.452 0.211 324.591)",
      "primary-foreground": "oklch(0.977 0.017 320.058)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.833 0.145 321.434)",
      "chart-2": "oklch(0.667 0.295 322.15)",
      "chart-3": "oklch(0.591 0.293 322.896)",
      "chart-4": "oklch(0.518 0.253 323.949)",
      "chart-5": "oklch(0.452 0.211 324.591)",
      "sidebar-primary": "oklch(0.667 0.295 322.15)",
      "sidebar-primary-foreground": "oklch(0.977 0.017 320.058)"
    },
    swatch: "oklch(0.518 0.253 323.949)"
  },
  green: {
    light: {
      primary: "oklch(0.527 0.154 150.069)",
      "primary-foreground": "oklch(0.982 0.018 155.826)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.871 0.15 154.449)",
      "chart-2": "oklch(0.723 0.219 149.579)",
      "chart-3": "oklch(0.627 0.194 149.214)",
      "chart-4": "oklch(0.527 0.154 150.069)",
      "chart-5": "oklch(0.448 0.119 151.328)",
      "sidebar-primary": "oklch(0.627 0.194 149.214)",
      "sidebar-primary-foreground": "oklch(0.982 0.018 155.826)"
    },
    dark: {
      primary: "oklch(0.448 0.119 151.328)",
      "primary-foreground": "oklch(0.982 0.018 155.826)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.871 0.15 154.449)",
      "chart-2": "oklch(0.723 0.219 149.579)",
      "chart-3": "oklch(0.627 0.194 149.214)",
      "chart-4": "oklch(0.527 0.154 150.069)",
      "chart-5": "oklch(0.448 0.119 151.328)",
      "sidebar-primary": "oklch(0.723 0.219 149.579)",
      "sidebar-primary-foreground": "oklch(0.982 0.018 155.826)"
    },
    swatch: "oklch(0.527 0.154 150.069)"
  },
  indigo: {
    light: {
      primary: "oklch(0.457 0.24 277.023)",
      "primary-foreground": "oklch(0.962 0.018 272.314)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.785 0.115 274.713)",
      "chart-2": "oklch(0.585 0.233 277.117)",
      "chart-3": "oklch(0.511 0.262 276.966)",
      "chart-4": "oklch(0.457 0.24 277.023)",
      "chart-5": "oklch(0.398 0.195 277.366)",
      "sidebar-primary": "oklch(0.511 0.262 276.966)",
      "sidebar-primary-foreground": "oklch(0.962 0.018 272.314)"
    },
    dark: {
      primary: "oklch(0.398 0.195 277.366)",
      "primary-foreground": "oklch(0.962 0.018 272.314)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.785 0.115 274.713)",
      "chart-2": "oklch(0.585 0.233 277.117)",
      "chart-3": "oklch(0.511 0.262 276.966)",
      "chart-4": "oklch(0.457 0.24 277.023)",
      "chart-5": "oklch(0.398 0.195 277.366)",
      "sidebar-primary": "oklch(0.585 0.233 277.117)",
      "sidebar-primary-foreground": "oklch(0.962 0.018 272.314)"
    },
    swatch: "oklch(0.457 0.24 277.023)"
  },
  lime: {
    light: {
      primary: "oklch(0.841 0.238 128.85)",
      "primary-foreground": "oklch(0.405 0.101 131.063)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.897 0.196 126.665)",
      "chart-2": "oklch(0.768 0.233 130.85)",
      "chart-3": "oklch(0.648 0.2 131.684)",
      "chart-4": "oklch(0.532 0.157 131.589)",
      "chart-5": "oklch(0.453 0.124 130.933)",
      "sidebar-primary": "oklch(0.648 0.2 131.684)",
      "sidebar-primary-foreground": "oklch(0.986 0.031 120.757)"
    },
    dark: {
      primary: "oklch(0.768 0.233 130.85)",
      "primary-foreground": "oklch(0.405 0.101 131.063)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.897 0.196 126.665)",
      "chart-2": "oklch(0.768 0.233 130.85)",
      "chart-3": "oklch(0.648 0.2 131.684)",
      "chart-4": "oklch(0.532 0.157 131.589)",
      "chart-5": "oklch(0.453 0.124 130.933)",
      "sidebar-primary": "oklch(0.768 0.233 130.85)",
      "sidebar-primary-foreground": "oklch(0.274 0.072 132.109)"
    },
    swatch: "oklch(0.841 0.238 128.85)"
  },
  orange: {
    light: {
      primary: "oklch(0.553 0.195 38.402)",
      "primary-foreground": "oklch(0.98 0.016 73.684)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.837 0.128 66.29)",
      "chart-2": "oklch(0.705 0.213 47.604)",
      "chart-3": "oklch(0.646 0.222 41.116)",
      "chart-4": "oklch(0.553 0.195 38.402)",
      "chart-5": "oklch(0.47 0.157 37.304)",
      "sidebar-primary": "oklch(0.646 0.222 41.116)",
      "sidebar-primary-foreground": "oklch(0.98 0.016 73.684)"
    },
    dark: {
      primary: "oklch(0.47 0.157 37.304)",
      "primary-foreground": "oklch(0.98 0.016 73.684)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.837 0.128 66.29)",
      "chart-2": "oklch(0.705 0.213 47.604)",
      "chart-3": "oklch(0.646 0.222 41.116)",
      "chart-4": "oklch(0.553 0.195 38.402)",
      "chart-5": "oklch(0.47 0.157 37.304)",
      "sidebar-primary": "oklch(0.705 0.213 47.604)",
      "sidebar-primary-foreground": "oklch(0.98 0.016 73.684)"
    },
    swatch: "oklch(0.553 0.195 38.402)"
  },
  pink: {
    light: {
      primary: "oklch(0.525 0.223 3.958)",
      "primary-foreground": "oklch(0.971 0.014 343.198)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.823 0.12 346.018)",
      "chart-2": "oklch(0.656 0.241 354.308)",
      "chart-3": "oklch(0.592 0.249 0.584)",
      "chart-4": "oklch(0.525 0.223 3.958)",
      "chart-5": "oklch(0.459 0.187 3.815)",
      "sidebar-primary": "oklch(0.592 0.249 0.584)",
      "sidebar-primary-foreground": "oklch(0.971 0.014 343.198)"
    },
    dark: {
      primary: "oklch(0.459 0.187 3.815)",
      "primary-foreground": "oklch(0.971 0.014 343.198)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.823 0.12 346.018)",
      "chart-2": "oklch(0.656 0.241 354.308)",
      "chart-3": "oklch(0.592 0.249 0.584)",
      "chart-4": "oklch(0.525 0.223 3.958)",
      "chart-5": "oklch(0.459 0.187 3.815)",
      "sidebar-primary": "oklch(0.656 0.241 354.308)",
      "sidebar-primary-foreground": "oklch(0.971 0.014 343.198)"
    },
    swatch: "oklch(0.525 0.223 3.958)"
  },
  purple: {
    light: {
      primary: "oklch(0.496 0.265 301.924)",
      "primary-foreground": "oklch(0.977 0.014 308.299)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.827 0.119 306.383)",
      "chart-2": "oklch(0.627 0.265 303.9)",
      "chart-3": "oklch(0.558 0.288 302.321)",
      "chart-4": "oklch(0.496 0.265 301.924)",
      "chart-5": "oklch(0.438 0.218 303.724)",
      "sidebar-primary": "oklch(0.558 0.288 302.321)",
      "sidebar-primary-foreground": "oklch(0.977 0.014 308.299)"
    },
    dark: {
      primary: "oklch(0.438 0.218 303.724)",
      "primary-foreground": "oklch(0.977 0.014 308.299)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.827 0.119 306.383)",
      "chart-2": "oklch(0.627 0.265 303.9)",
      "chart-3": "oklch(0.558 0.288 302.321)",
      "chart-4": "oklch(0.496 0.265 301.924)",
      "chart-5": "oklch(0.438 0.218 303.724)",
      "sidebar-primary": "oklch(0.627 0.265 303.9)",
      "sidebar-primary-foreground": "oklch(0.977 0.014 308.299)"
    },
    swatch: "oklch(0.496 0.265 301.924)"
  },
  red: {
    light: {
      primary: "oklch(0.505 0.213 27.518)",
      "primary-foreground": "oklch(0.971 0.013 17.38)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.808 0.114 19.571)",
      "chart-2": "oklch(0.637 0.237 25.331)",
      "chart-3": "oklch(0.577 0.245 27.325)",
      "chart-4": "oklch(0.505 0.213 27.518)",
      "chart-5": "oklch(0.444 0.177 26.899)",
      "sidebar-primary": "oklch(0.577 0.245 27.325)",
      "sidebar-primary-foreground": "oklch(0.971 0.013 17.38)"
    },
    dark: {
      primary: "oklch(0.444 0.177 26.899)",
      "primary-foreground": "oklch(0.971 0.013 17.38)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.808 0.114 19.571)",
      "chart-2": "oklch(0.637 0.237 25.331)",
      "chart-3": "oklch(0.577 0.245 27.325)",
      "chart-4": "oklch(0.505 0.213 27.518)",
      "chart-5": "oklch(0.444 0.177 26.899)",
      "sidebar-primary": "oklch(0.637 0.237 25.331)",
      "sidebar-primary-foreground": "oklch(0.971 0.013 17.38)"
    },
    swatch: "oklch(0.505 0.213 27.518)"
  },
  rose: {
    light: {
      primary: "oklch(0.514 0.222 16.935)",
      "primary-foreground": "oklch(0.969 0.015 12.422)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.81 0.117 11.638)",
      "chart-2": "oklch(0.645 0.246 16.439)",
      "chart-3": "oklch(0.586 0.253 17.585)",
      "chart-4": "oklch(0.514 0.222 16.935)",
      "chart-5": "oklch(0.455 0.188 13.697)",
      "sidebar-primary": "oklch(0.586 0.253 17.585)",
      "sidebar-primary-foreground": "oklch(0.969 0.015 12.422)"
    },
    dark: {
      primary: "oklch(0.455 0.188 13.697)",
      "primary-foreground": "oklch(0.969 0.015 12.422)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.81 0.117 11.638)",
      "chart-2": "oklch(0.645 0.246 16.439)",
      "chart-3": "oklch(0.586 0.253 17.585)",
      "chart-4": "oklch(0.514 0.222 16.935)",
      "chart-5": "oklch(0.455 0.188 13.697)",
      sidebar: "oklch(0.21 0.006 285.885)",
      "sidebar-primary": "oklch(0.645 0.246 16.439)",
      "sidebar-primary-foreground": "oklch(0.969 0.015 12.422)"
    },
    swatch: "oklch(0.514 0.222 16.935)"
  },
  sky: {
    light: {
      primary: "oklch(0.5 0.134 242.749)",
      "primary-foreground": "oklch(0.977 0.013 236.62)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.828 0.111 230.318)",
      "chart-2": "oklch(0.685 0.169 237.323)",
      "chart-3": "oklch(0.588 0.158 241.966)",
      "chart-4": "oklch(0.5 0.134 242.749)",
      "chart-5": "oklch(0.443 0.11 240.79)",
      "sidebar-primary": "oklch(0.588 0.158 241.966)",
      "sidebar-primary-foreground": "oklch(0.977 0.013 236.62)"
    },
    dark: {
      primary: "oklch(0.443 0.11 240.79)",
      "primary-foreground": "oklch(0.977 0.013 236.62)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.828 0.111 230.318)",
      "chart-2": "oklch(0.685 0.169 237.323)",
      "chart-3": "oklch(0.588 0.158 241.966)",
      "chart-4": "oklch(0.5 0.134 242.749)",
      "chart-5": "oklch(0.443 0.11 240.79)",
      "sidebar-primary": "oklch(0.685 0.169 237.323)",
      "sidebar-primary-foreground": "oklch(0.293 0.066 243.157)"
    },
    swatch: "oklch(0.5 0.134 242.749)"
  },
  teal: {
    light: {
      primary: "oklch(0.511 0.096 186.391)",
      "primary-foreground": "oklch(0.984 0.014 180.72)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.855 0.138 181.071)",
      "chart-2": "oklch(0.704 0.14 182.503)",
      "chart-3": "oklch(0.6 0.118 184.704)",
      "chart-4": "oklch(0.511 0.096 186.391)",
      "chart-5": "oklch(0.437 0.078 188.216)",
      "sidebar-primary": "oklch(0.6 0.118 184.704)",
      "sidebar-primary-foreground": "oklch(0.984 0.014 180.72)"
    },
    dark: {
      primary: "oklch(0.437 0.078 188.216)",
      "primary-foreground": "oklch(0.984 0.014 180.72)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.855 0.138 181.071)",
      "chart-2": "oklch(0.704 0.14 182.503)",
      "chart-3": "oklch(0.6 0.118 184.704)",
      "chart-4": "oklch(0.511 0.096 186.391)",
      "chart-5": "oklch(0.437 0.078 188.216)",
      "sidebar-primary": "oklch(0.704 0.14 182.503)",
      "sidebar-primary-foreground": "oklch(0.277 0.046 192.524)"
    },
    swatch: "oklch(0.511 0.096 186.391)"
  },
  violet: {
    light: {
      primary: "oklch(0.491 0.27 292.581)",
      "primary-foreground": "oklch(0.969 0.016 293.756)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.811 0.111 293.571)",
      "chart-2": "oklch(0.606 0.25 292.717)",
      "chart-3": "oklch(0.541 0.281 293.009)",
      "chart-4": "oklch(0.491 0.27 292.581)",
      "chart-5": "oklch(0.432 0.232 292.759)",
      "sidebar-primary": "oklch(0.541 0.281 293.009)",
      "sidebar-primary-foreground": "oklch(0.969 0.016 293.756)"
    },
    dark: {
      primary: "oklch(0.432 0.232 292.759)",
      "primary-foreground": "oklch(0.969 0.016 293.756)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.811 0.111 293.571)",
      "chart-2": "oklch(0.606 0.25 292.717)",
      "chart-3": "oklch(0.541 0.281 293.009)",
      "chart-4": "oklch(0.491 0.27 292.581)",
      "chart-5": "oklch(0.432 0.232 292.759)",
      "sidebar-primary": "oklch(0.606 0.25 292.717)",
      "sidebar-primary-foreground": "oklch(0.969 0.016 293.756)"
    },
    swatch: "oklch(0.491 0.27 292.581)"
  },
  yellow: {
    light: {
      primary: "oklch(0.852 0.199 91.936)",
      "primary-foreground": "oklch(0.421 0.095 57.708)",
      secondary: "oklch(0.967 0.001 286.375)",
      "secondary-foreground": "oklch(0.21 0.006 285.885)",
      "chart-1": "oklch(0.905 0.182 98.111)",
      "chart-2": "oklch(0.795 0.184 86.047)",
      "chart-3": "oklch(0.681 0.162 75.834)",
      "chart-4": "oklch(0.554 0.135 66.442)",
      "chart-5": "oklch(0.476 0.114 61.907)",
      "sidebar-primary": "oklch(0.681 0.162 75.834)",
      "sidebar-primary-foreground": "oklch(0.987 0.026 102.212)"
    },
    dark: {
      primary: "oklch(0.795 0.184 86.047)",
      "primary-foreground": "oklch(0.421 0.095 57.708)",
      secondary: "oklch(0.274 0.006 286.033)",
      "secondary-foreground": "oklch(0.985 0 0)",
      "chart-1": "oklch(0.905 0.182 98.111)",
      "chart-2": "oklch(0.795 0.184 86.047)",
      "chart-3": "oklch(0.681 0.162 75.834)",
      "chart-4": "oklch(0.554 0.135 66.442)",
      "chart-5": "oklch(0.476 0.114 61.907)",
      "sidebar-primary": "oklch(0.795 0.184 86.047)",
      "sidebar-primary-foreground": "oklch(0.987 0.026 102.212)"
    },
    swatch: "oklch(0.852 0.199 91.936)"
  }
}

const FONTS = {
  geist: {
    title: "Geist",
    family: "Geist, ui-sans-serif, sans-serif",
    google: "Geist:wght@400;500;600;700"
  },
  inter: {
    title: "Inter",
    family: "Inter, ui-sans-serif, sans-serif",
    google: "Inter:wght@400;500;600;700"
  },
  "noto-sans": {
    title: "Noto Sans",
    family: "'Noto Sans', ui-sans-serif, sans-serif",
    google: "Noto+Sans:wght@400;500;600;700"
  },
  "nunito-sans": {
    title: "Nunito Sans",
    family: "'Nunito Sans', ui-sans-serif, sans-serif",
    google: "Nunito+Sans:wght@400;500;600;700"
  },
  figtree: {
    title: "Figtree",
    family: "Figtree, ui-sans-serif, sans-serif",
    google: "Figtree:wght@400;500;600;700"
  },
  roboto: {
    title: "Roboto",
    family: "Roboto, ui-sans-serif, sans-serif",
    google: "Roboto:wght@400;500;600;700"
  },
  raleway: {
    title: "Raleway",
    family: "Raleway, ui-sans-serif, sans-serif",
    google: "Raleway:wght@400;500;600;700"
  },
  "dm-sans": {
    title: "DM Sans",
    family: "'DM Sans', ui-sans-serif, sans-serif",
    google: "DM+Sans:wght@400;500;600;700"
  },
  "public-sans": {
    title: "Public Sans",
    family: "'Public Sans', ui-sans-serif, sans-serif",
    google: "Public+Sans:wght@400;500;600;700"
  },
  outfit: {
    title: "Outfit",
    family: "Outfit, ui-sans-serif, sans-serif",
    google: "Outfit:wght@400;500;600;700"
  },
  oxanium: {
    title: "Oxanium",
    family: "Oxanium, ui-sans-serif, sans-serif",
    google: "Oxanium:wght@400;500;600;700"
  },
  manrope: {
    title: "Manrope",
    family: "Manrope, ui-sans-serif, sans-serif",
    google: "Manrope:wght@400;500;600;700"
  },
  "space-grotesk": {
    title: "Space Grotesk",
    family: "'Space Grotesk', ui-sans-serif, sans-serif",
    google: "Space+Grotesk:wght@400;500;600;700"
  },
  montserrat: {
    title: "Montserrat",
    family: "Montserrat, ui-sans-serif, sans-serif",
    google: "Montserrat:wght@400;500;600;700"
  },
  "ibm-plex-sans": {
    title: "IBM Plex Sans",
    family: "'IBM Plex Sans', ui-sans-serif, sans-serif",
    google: "IBM+Plex+Sans:wght@400;500;600;700"
  },
  "source-sans-3": {
    title: "Source Sans 3",
    family: "'Source Sans 3', ui-sans-serif, sans-serif",
    google: "Source+Sans+3:wght@400;500;600;700"
  },
  "instrument-sans": {
    title: "Instrument Sans",
    family: "'Instrument Sans', ui-sans-serif, sans-serif",
    google: "Instrument+Sans:wght@400;500;600;700"
  },
  "jetbrains-mono": {
    title: "JetBrains Mono",
    family: "'JetBrains Mono', ui-monospace, monospace",
    google: "JetBrains+Mono:wght@400;500;600;700"
  },
  "geist-mono": {
    title: "Geist Mono",
    family: "'Geist Mono', ui-monospace, monospace",
    google: "Geist+Mono:wght@400;500;600;700"
  },
  "noto-serif": {
    title: "Noto Serif",
    family: "'Noto Serif', ui-serif, serif",
    google: "Noto+Serif:wght@400;500;600;700"
  },
  "roboto-slab": {
    title: "Roboto Slab",
    family: "'Roboto Slab', ui-serif, serif",
    google: "Roboto+Slab:wght@400;500;600;700"
  },
  merriweather: {
    title: "Merriweather",
    family: "Merriweather, ui-serif, serif",
    google: "Merriweather:wght@400;500;600;700"
  },
  lora: {
    title: "Lora",
    family: "Lora, ui-serif, serif",
    google: "Lora:wght@400;500;600;700"
  },
  "playfair-display": {
    title: "Playfair Display",
    family: "'Playfair Display', ui-serif, serif",
    google: "Playfair+Display:wght@400;500;600;700"
  },
  "eb-garamond": {
    title: "EB Garamond",
    family: "'EB Garamond', ui-serif, serif",
    google: "EB+Garamond:wght@400;500;600;700"
  },
  "instrument-serif": {
    title: "Instrument Serif",
    family: "'Instrument Serif', ui-serif, serif",
    google: "Instrument+Serif:wght@400"
  }
}

const RADII = {
  default: {
    title: "Default",
    value: null
  },
  none: {
    title: "None",
    value: "0px"
  },
  small: {
    title: "Small",
    value: "0.45rem"
  },
  medium: {
    title: "Medium",
    value: "0.625rem"
  },
  large: {
    title: "Large",
    value: "0.875rem"
  }
}

const CHART_COLORS = {
  amber: {
    "chart-1": "oklch(0.879 0.169 91.605)",
    "chart-2": "oklch(0.769 0.188 70.08)",
    "chart-3": "oklch(0.666 0.179 58.318)",
    "chart-4": "oklch(0.555 0.163 48.998)",
    "chart-5": "oklch(0.473 0.137 46.201)",
    swatch: "oklch(0.769 0.188 70.08)"
  },
  blue: {
    "chart-1": "oklch(0.809 0.105 251.813)",
    "chart-2": "oklch(0.623 0.214 259.815)",
    "chart-3": "oklch(0.546 0.245 262.881)",
    "chart-4": "oklch(0.488 0.243 264.376)",
    "chart-5": "oklch(0.424 0.199 265.638)",
    swatch: "oklch(0.623 0.214 259.815)"
  },
  cyan: {
    "chart-1": "oklch(0.865 0.127 207.078)",
    "chart-2": "oklch(0.715 0.143 215.221)",
    "chart-3": "oklch(0.609 0.126 221.723)",
    "chart-4": "oklch(0.52 0.105 223.128)",
    "chart-5": "oklch(0.45 0.085 224.283)",
    swatch: "oklch(0.715 0.143 215.221)"
  },
  emerald: {
    "chart-1": "oklch(0.845 0.143 164.978)",
    "chart-2": "oklch(0.696 0.17 162.48)",
    "chart-3": "oklch(0.596 0.145 163.225)",
    "chart-4": "oklch(0.508 0.118 165.612)",
    "chart-5": "oklch(0.432 0.095 166.913)",
    swatch: "oklch(0.696 0.17 162.48)"
  },
  fuchsia: {
    "chart-1": "oklch(0.833 0.145 321.434)",
    "chart-2": "oklch(0.667 0.295 322.15)",
    "chart-3": "oklch(0.591 0.293 322.896)",
    "chart-4": "oklch(0.518 0.253 323.949)",
    "chart-5": "oklch(0.452 0.211 324.591)",
    swatch: "oklch(0.667 0.295 322.15)"
  },
  green: {
    "chart-1": "oklch(0.871 0.15 154.449)",
    "chart-2": "oklch(0.723 0.219 149.579)",
    "chart-3": "oklch(0.627 0.194 149.214)",
    "chart-4": "oklch(0.527 0.154 150.069)",
    "chart-5": "oklch(0.448 0.119 151.328)",
    swatch: "oklch(0.723 0.219 149.579)"
  },
  indigo: {
    "chart-1": "oklch(0.785 0.115 274.713)",
    "chart-2": "oklch(0.585 0.233 277.117)",
    "chart-3": "oklch(0.511 0.262 276.966)",
    "chart-4": "oklch(0.457 0.24 277.023)",
    "chart-5": "oklch(0.398 0.195 277.366)",
    swatch: "oklch(0.585 0.233 277.117)"
  },
  lime: {
    "chart-1": "oklch(0.897 0.196 126.665)",
    "chart-2": "oklch(0.768 0.233 130.85)",
    "chart-3": "oklch(0.648 0.2 131.684)",
    "chart-4": "oklch(0.532 0.157 131.589)",
    "chart-5": "oklch(0.453 0.124 130.933)",
    swatch: "oklch(0.768 0.233 130.85)"
  },
  orange: {
    "chart-1": "oklch(0.837 0.128 66.29)",
    "chart-2": "oklch(0.705 0.213 47.604)",
    "chart-3": "oklch(0.646 0.222 41.116)",
    "chart-4": "oklch(0.553 0.195 38.402)",
    "chart-5": "oklch(0.47 0.157 37.304)",
    swatch: "oklch(0.705 0.213 47.604)"
  },
  pink: {
    "chart-1": "oklch(0.823 0.12 346.018)",
    "chart-2": "oklch(0.656 0.241 354.308)",
    "chart-3": "oklch(0.592 0.249 0.584)",
    "chart-4": "oklch(0.525 0.223 3.958)",
    "chart-5": "oklch(0.459 0.187 3.815)",
    swatch: "oklch(0.656 0.241 354.308)"
  },
  purple: {
    "chart-1": "oklch(0.827 0.119 306.383)",
    "chart-2": "oklch(0.627 0.265 303.9)",
    "chart-3": "oklch(0.558 0.288 302.321)",
    "chart-4": "oklch(0.496 0.265 301.924)",
    "chart-5": "oklch(0.438 0.218 303.724)",
    swatch: "oklch(0.627 0.265 303.9)"
  },
  red: {
    "chart-1": "oklch(0.808 0.114 19.571)",
    "chart-2": "oklch(0.637 0.237 25.331)",
    "chart-3": "oklch(0.577 0.245 27.325)",
    "chart-4": "oklch(0.505 0.213 27.518)",
    "chart-5": "oklch(0.444 0.177 26.899)",
    swatch: "oklch(0.637 0.237 25.331)"
  },
  rose: {
    "chart-1": "oklch(0.81 0.117 11.638)",
    "chart-2": "oklch(0.645 0.246 16.439)",
    "chart-3": "oklch(0.586 0.253 17.585)",
    "chart-4": "oklch(0.514 0.222 16.935)",
    "chart-5": "oklch(0.455 0.188 13.697)",
    swatch: "oklch(0.645 0.246 16.439)"
  },
  sky: {
    "chart-1": "oklch(0.828 0.111 230.318)",
    "chart-2": "oklch(0.685 0.169 237.323)",
    "chart-3": "oklch(0.588 0.158 241.966)",
    "chart-4": "oklch(0.5 0.134 242.749)",
    "chart-5": "oklch(0.443 0.11 240.79)",
    swatch: "oklch(0.685 0.169 237.323)"
  },
  teal: {
    "chart-1": "oklch(0.855 0.138 181.071)",
    "chart-2": "oklch(0.704 0.14 182.503)",
    "chart-3": "oklch(0.6 0.118 184.704)",
    "chart-4": "oklch(0.511 0.096 186.391)",
    "chart-5": "oklch(0.437 0.078 188.216)",
    swatch: "oklch(0.704 0.14 182.503)"
  },
  violet: {
    "chart-1": "oklch(0.811 0.111 293.571)",
    "chart-2": "oklch(0.606 0.25 292.717)",
    "chart-3": "oklch(0.541 0.281 293.009)",
    "chart-4": "oklch(0.491 0.27 292.581)",
    "chart-5": "oklch(0.432 0.232 292.759)",
    swatch: "oklch(0.606 0.25 292.717)"
  },
  yellow: {
    "chart-1": "oklch(0.905 0.182 98.111)",
    "chart-2": "oklch(0.795 0.184 86.047)",
    "chart-3": "oklch(0.681 0.162 75.834)",
    "chart-4": "oklch(0.554 0.135 66.442)",
    "chart-5": "oklch(0.476 0.114 61.907)",
    swatch: "oklch(0.795 0.184 86.047)"
  }
}
// Resolved picker values for the v1 prototype (globals.css) — not shadcn random combos.
const V1_DEFAULTS = {
  style: "nova",
  color: "original",
  background: "classic",
  theme: "green",
  chart: "green",
  heading: "inherit",
  font: "manrope",
  radius: "default"
}
const APPEARANCE_KINDS = ["style", "color", "background", "theme", "chart", "heading", "font", "radius"]
const PRESET = "preset"

function storedAppearance() {
  const fromServer = serverAppearance()
  if (fromServer !== null) return fromServer
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}

function resolveKind(key, stored, allowed) {
  const raw = stored[key]
  if (!raw || raw === PRESET) return V1_DEFAULTS[key]
  return allowed[raw] ? raw : V1_DEFAULTS[key]
}

function isAppearancePreset(kind, raw = storedAppearance()) {
  const value = raw[kind]
  return !value || value === PRESET
}

function appearanceIsAllPreset(raw = storedAppearance()) {
  return APPEARANCE_KINDS.every((kind) => isAppearancePreset(kind, raw))
}

function applyV1DanlioAppearance() {
  const style = V1_DEFAULTS.style
  const color = V1_DEFAULTS.color
  const background = V1_DEFAULTS.background
  const theme = V1_DEFAULTS.theme
  const chart = V1_DEFAULTS.chart
  const font = V1_DEFAULTS.font
  const heading = V1_DEFAULTS.heading
  const radius = V1_DEFAULTS.radius
  const root = document.documentElement
  const palette = PALETTES.original.light

  Object.entries(palette).forEach(([name, value]) => {
    if (name === "swatch") return
    root.style.setProperty(`--${name}`, value)
  })
  root.style.setProperty("--background", BACKGROUNDS.classic.background)
  root.style.setProperty("--radius", RADII[radius].value || STYLES[style].radius)
  root.style.setProperty("--font-sans", FONTS.manrope.family)
  root.style.setProperty("--font-heading", "var(--font-sans)")
  root.style.setProperty("--olive", "#66734a")
  root.style.setProperty("--olive-dark", "#414b32")
  root.style.setProperty("--olive-deep", "#46512f")
  root.style.setProperty("--sage", "#e8ecdf")
  root.style.setProperty("--surface", "#ffffff")
  root.style.setProperty("--surface-muted", "#fdfdfb")
  root.style.setProperty("--line", "#e1e4da")
  root.style.setProperty("--line-soft", "#ecefe6")
  root.style.setProperty("--text-muted", "#70756b")
  root.style.setProperty("--text-subtle", "#8b9086")
  root.style.setProperty("--overlay", "rgba(32, 35, 29, 0.4)")
  root.style.setProperty("--shadow-card", "0 18px 45px rgba(66, 75, 49, 0.1)")
  applyFonts(font, heading)
  root.style.colorScheme = "light"
  root.dataset.themeStyle = style
  root.dataset.themeColor = color
  root.dataset.theme = theme
  root.dataset.themeChart = chart
  root.dataset.themeFont = font
  root.dataset.themeHeading = heading
  root.dataset.themeRadius = radius
  root.dataset.themeBackground = background
  root.dataset.themeMode = "light"
  root.dataset.themeV1 = "true"
  return { style, color, theme, chart, font, heading, radius, background }
}

function readBackground(stored) {
  if (!stored.background || stored.background === PRESET) return V1_DEFAULTS.background
  if (BACKGROUNDS[stored.background]) return stored.background
  if (BACKGROUNDS[stored.theme] && !THEMES[stored.theme]) return stored.theme
  if (stored.mode === "light") return "light"
  return V1_DEFAULTS.background
}

function serverAppearance() {
  const el = document.getElementById("danlio-appearance")
  if (!el) return null
  try {
    return JSON.parse(el.textContent || "{}")
  } catch {
    return {}
  }
}

function readRawAppearance() {
  return storedAppearance()
}

function readAppearance() {
  try {
    const stored = storedAppearance()
    const background = readBackground(stored)
    const headingRaw = stored.heading
    let heading = V1_DEFAULTS.heading
    if (headingRaw && headingRaw !== PRESET) {
      heading = headingRaw === "inherit" || FONTS[headingRaw] ? headingRaw : V1_DEFAULTS.heading
    }
    return {
      style: resolveKind("style", stored, STYLES),
      color: resolveKind("color", stored, PALETTES),
      theme: resolveKind("theme", stored, THEMES),
      chart: resolveKind("chart", stored, CHART_COLORS),
      font: resolveKind("font", stored, FONTS),
      heading,
      radius: resolveKind("radius", stored, RADII),
      background
    }
  } catch {
    return { ...V1_DEFAULTS }
  }
}

function applyFonts(font, heading) {
  const names = [font, heading].filter((name) => name && name !== "inherit" && FONTS[name])
  const unique = [...new Set(names)]
  let link = document.getElementById("danlio-fonts")
  if (!link) {
    link = document.createElement("link")
    link.id = "danlio-fonts"
    link.rel = "stylesheet"
    document.head.appendChild(link)
  }
  link.href = `https://fonts.googleapis.com/css2?${unique.map((name) => `family=${FONTS[name].google}`).join("&")}&display=swap`
}

function applyAppearance(rawInput) {
  const raw = rawInput ?? storedAppearance()
  if (appearanceIsAllPreset(raw)) {
    return applyV1DanlioAppearance()
  }

  const next = readAppearance()
  const style = STYLES[next.style] ? next.style : V1_DEFAULTS.style
  const color = PALETTES[next.color] ? next.color : V1_DEFAULTS.color
  const theme = THEMES[next.theme] ? next.theme : V1_DEFAULTS.theme
  const chart = CHART_COLORS[next.chart] ? next.chart : V1_DEFAULTS.chart
  const font = FONTS[next.font] ? next.font : V1_DEFAULTS.font
  const heading = next.heading === "inherit" || FONTS[next.heading] ? next.heading : V1_DEFAULTS.heading
  const radius = RADII[next.radius] ? next.radius : V1_DEFAULTS.radius
  const background = BACKGROUNDS[next.background] ? next.background : V1_DEFAULTS.background
  const canvas = BACKGROUNDS[background]
  const mode = canvas.mode
  const root = document.documentElement
  const palette = PALETTES[color][mode]
  Object.entries(palette).forEach(([name, value]) => {
    if (name === "swatch") return
    root.style.setProperty(`--${name}`, value)
  })
  Object.entries(THEMES[theme][mode]).forEach(([name, value]) => {
    if (name.indexOf("chart-") === 0) return
    root.style.setProperty(`--${name}`, value)
  })
  Object.entries(CHART_COLORS[chart]).forEach(([name, value]) => {
    if (name === "swatch") return
    root.style.setProperty(`--${name}`, value)
  })
  root.style.setProperty("--background", canvas.background)
  root.style.setProperty("--radius", RADII[radius].value || STYLES[style].radius)
  root.style.setProperty("--font-sans", FONTS[font].family)
  root.style.setProperty("--font-heading", heading === "inherit" ? "var(--font-sans)" : FONTS[heading].family)
  root.style.setProperty("--olive", "var(--primary)")
  root.style.setProperty("--olive-dark", "var(--foreground)")
  root.style.setProperty("--olive-deep", "var(--foreground)")
  root.style.setProperty("--sage", "var(--accent)")
  root.style.setProperty("--surface", "var(--card)")
  root.style.setProperty("--surface-muted", "var(--muted)")
  root.style.setProperty("--line", "var(--border)")
  root.style.setProperty("--line-soft", "var(--border)")
  root.style.setProperty("--text-muted", "var(--muted-foreground)")
  root.style.setProperty("--text-subtle", "var(--muted-foreground)")
  if (mode === "light") {
    root.style.setProperty("--overlay", "oklch(0 0 0 / 40%)")
    root.style.setProperty("--shadow-card", "0 8px 24px color-mix(in oklch, black 10%, transparent)")
  } else {
    root.style.setProperty("--overlay", "oklch(0 0 0 / 60%)")
    root.style.setProperty("--shadow-card", "0 8px 24px color-mix(in oklch, black 28%, transparent)")
  }
  applyFonts(font, heading)
  root.style.colorScheme = mode
  root.dataset.themeStyle = style
  root.dataset.themeColor = color
  root.dataset.theme = theme
  root.dataset.themeChart = chart
  root.dataset.themeFont = font
  root.dataset.themeHeading = heading
  root.dataset.themeRadius = radius
  root.dataset.themeBackground = background
  root.dataset.themeMode = mode
  delete root.dataset.themeV1
  return { style, color, theme, chart, font, heading, radius, background }
}

function persistAppearance(applied) {
  const meta = document.querySelector('meta[name="danlio-appearance-url"]')
  const token = document.querySelector('meta[name="csrf-token"]')
  if (!meta || !token) return

  fetch(meta.content, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": token.content
    },
    body: JSON.stringify({ appearance: applied })
  }).catch(() => {})
}

function saveAppearance(next) {
  const stored = { ...next }
  applyAppearance(stored)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  const el = document.getElementById("danlio-appearance")
  if (el) el.textContent = JSON.stringify(stored)
  persistAppearance(stored)
  const detail = readAppearance()
  window.dispatchEvent(new CustomEvent("danlio:appearance", { detail }))
  return stored
}

function appearanceMeta() {
  return {
    styles: Object.keys(STYLES),
    colors: Object.keys(PALETTES),
    themes: THEMES,
    charts: CHART_COLORS,
    fonts: FONTS,
    radii: RADII,
    backgrounds: BACKGROUNDS,
    palettes: PALETTES,
    stylesMap: STYLES
  }
}

applyAppearance()
window.DanlioAppearance = {
  readAppearance,
  readRawAppearance,
  applyAppearance,
  saveAppearance,
  appearanceMeta,
  v1Defaults: V1_DEFAULTS,
  isAppearancePreset,
  appearanceIsAllPreset,
  appearancePreset: PRESET
}
