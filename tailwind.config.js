/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          main:    'var(--color-main)',
          light:   'var(--color-light)',
          dark:    'var(--color-dark)',
          glow:    'var(--color-glow)',
          accent2: 'var(--color-accent2)',
        }
      },
      backgroundColor: {
        app:     'var(--bg-app)',
        surface: 'var(--bg-surface)',
        card:    'var(--bg-card)',
        input:   'var(--bg-input)',
      },
      borderColor: {
        theme:  'var(--border)',
        subtle: 'var(--border-subtle)',
      },
      textColor: {
        primary:   'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted:     'var(--text-muted)',
      },
    },
  },
  plugins: [],
}