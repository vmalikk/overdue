// Theme configuration matching the spec
export const theme = {
  colors: {
    background: '#0a0a0a',      // Primary background
    secondary: '#151515',        // Secondary background
    accent: '#1a1a1a',          // Accent background
    border: '#27272a',          // Borders

    text: {
      primary: '#e4e4e7',       // Main text
      secondary: '#a1a1aa',     // Secondary text
      muted: '#71717a'          // Muted text
    },

    status: {
      red: '#ef4444',           // Due soon/overdue
      yellow: '#eab308',        // Due this week
      green: '#22c55e',         // Due later
      gray: '#6b7280'           // Completed
    },

    priority: {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444'
    }
  },

  spacing: {
    miniCalendar: {
      width: '280px',
      height: '300px'
    },
    statusIndicator: {
      size: '20px'
    }
  },

  layout: {
    maxWidth: '1400px',
    tableWidth: '70%',
    sidebarWidth: '30%'
  },

  columnWidths: {
    statusIndicator: '60px',
    title: '40%',
    course: '20%',
    deadline: '20%',
    priority: '10%',
    actions: '10%'
  }
}

export type Theme = typeof theme
