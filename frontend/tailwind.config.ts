import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        servora: {
          blue: {
            from: '#4DB8FF',
            to: '#2F8CFF',
          },
          violet: {
            from: '#5B3CF0',
            to: '#7C5CFF',
          },
          dark: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
        },
      },
      backgroundImage: {
        'servora-blue': 'linear-gradient(135deg, #4DB8FF 0%, #2F8CFF 100%)',
        'servora-violet': 'linear-gradient(135deg, #5B3CF0 0%, #7C5CFF 100%)',
        'servora-hero': 'radial-gradient(ellipse at top, rgba(77, 184, 255, 0.15) 0%, rgba(91, 60, 240, 0.08) 50%, transparent 80%)',
      },
    },
  },
  plugins: [],
};

export default config;

