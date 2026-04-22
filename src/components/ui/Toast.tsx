'use client'

import { useEffect } from 'react'
import { Toast as ToastType, useUIStore } from '@/store/uiStore'

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useUIStore(state => state.removeToast)

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => removeToast(toast.id), toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, removeToast])

  const borderColors = {
    success: 'var(--green)',
    error: 'var(--red)',
    info: 'var(--accent)',
    warning: 'var(--yellow)',
  }

  const icons = {
    success: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    ),
    error: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    ),
    info: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
    ),
    warning: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
      </svg>
    ),
  }

  const borderColor = borderColors[toast.type]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '12px 14px',
      background: 'var(--bg3)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'toastIn 0.25s ease both',
      minWidth: 260,
      maxWidth: 380,
    }}>
      <span style={{ color: borderColor, flexShrink: 0, marginTop: 1 }}>
        {icons[toast.type]}
      </span>
      <p style={{ flex: 1, fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text3)',
          padding: 0,
          flexShrink: 0,
          display: 'flex',
          marginTop: 1,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore(state => state.toasts)
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
