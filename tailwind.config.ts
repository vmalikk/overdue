import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        secondary: 'var(--bg2)',
        surface: 'var(--bg3)',
        'surface-hover': 'var(--bg4)',
        accent: 'var(--bg4)',
        border: 'var(--border)',
        text: {
          primary: 'var(--text)',
          secondary: 'var(--text2)',
          muted: 'var(--text3)',
        },
        primary: 'var(--accent)',
        status: {
          red: 'var(--red)',
          yellow: 'var(--yellow)',
          green: 'var(--green)',
          gray: '#6b7280',
        },
        priority: {
          low: '#3b82f6',
          medium: 'var(--accent)',
          high: 'var(--red)',
        },
      },
    },
  },
  plugins: [],
}

export default config
