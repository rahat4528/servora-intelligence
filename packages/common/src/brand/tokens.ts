/**
 * Servora Intelligence Brand Tokens
 * Source of truth for color gradients, geometry, and styling.
 */

export const brandTokens = {
  name: 'Servora Intelligence',
  slug: 'servora',
  tagline: 'Intelligent AI-Powered Customer Support & Operations Platform',
  colors: {
    // Upper geometric half: Sky Blue to Azure
    blueGradient: {
      from: '#4DB8FF',
      to: '#2F8CFF',
      id: 'servora-blue-grad',
    },
    // Lower geometric half: Indigo to Soft Purple
    violetGradient: {
      from: '#5B3CF0',
      to: '#7C5CFF',
      id: 'servora-violet-grad',
    },
    // Monochrome fallbacks
    monochromeDark: '#0F172A', // Slate 900
    monochromeLight: '#F8FAFC', // Slate 50
    // Neutral accents
    neutral: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },
    // Status colors
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
    },
  },
  typography: {
    fontFamilySans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyMono: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
  },
} as const;

export type BrandTokens = typeof brandTokens;

