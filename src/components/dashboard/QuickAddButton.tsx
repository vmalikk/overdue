'use client'

import { useUIStore } from '@/store/uiStore'

export function QuickAddButton() {
  const openQuickAdd = useUIStore((state) => state.openQuickAdd)

  return (
    <button
      onClick={openQuickAdd}
      className="fixed bottom-6 right-6 w-14 h-14 bg-priority-medium hover:bg-priority-medium/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 group"
      aria-label="Add new assignment"
    >
      <svg
        className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M12 4v16m8-8H4" />
      </svg>
    </button>
  )
}
