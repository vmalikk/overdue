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
        background: '#0a0a0a',
        secondary: '#151515',
        accent: '#1a1a1a',
        border: '#27272a',
        text: {
          primary: '#e4e4e7',
          secondary: '#a1a1aa',
          muted: '#71717a',
        },
        status: {
          red: '#ef4444',
          yellow: '#eab308',
          green: '#22c55e',
          gray: '#6b7280',
        },
        priority: {
          low: '#3b82f6',
          medium: '#f59e0b',
          high: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}

export default config
