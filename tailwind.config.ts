import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        navy: {
          950: '#070C18',
          900: '#0B1224',
          800: '#101A33',
          700: '#16234A',
        },
        blue: {
          600: '#2457E5',
          500: '#2F6BFF',
          400: '#5C8CFF',
        },
        mist: {
          50: '#F7F9FC',
          100: '#EEF2F8',
          200: '#E3E8F1',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.75rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'mist-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #EEF2F8 100%)',
        'navy-gradient': 'linear-gradient(160deg, #0B1224 0%, #16234A 60%, #1D2C5C 100%)',
        'blue-gradient': 'linear-gradient(135deg, #2457E5 0%, #5C8CFF 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
