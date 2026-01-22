import { create } from 'zustand'
import { NLPParseResult, StudyTipsResponse, DeadlineSuggestion, RateLimitState } from '@/types/ai'

interface AIStore {
  // State
  isParsingEnabled: boolean
  parseResult: NLPParseResult | null
  studyTips: Record<string, StudyTipsResponse> // assignmentId -> tips
  suggestions: Record<string, DeadlineSuggestion> // assignmentId -> suggestion
  rateLimit: RateLimitState
  isProcessing: boolean
  lastError: string | null

  // Actions
  setParsingEnabled: (enabled: boolean) => void
  setParseResult: (result: NLPParseResult | null) => void
  clearParseResult: () => void

  // Study tips
  setStudyTips: (assignmentId: string, tips: StudyTipsResponse) => void
  getStudyTips: (assignmentId: string) => StudyTipsResponse | undefined
  clearStudyTips: (assignmentId: string) => void

  // Suggestions
  setSuggestion: (assignmentId: string, suggestion: DeadlineSuggestion) => void
  getSuggestion: (assignmentId: string) => DeadlineSuggestion | undefined
  clearSuggestion: (assignmentId: string) => void

  // Rate limiting
  incrementRequestCount: () => void
  resetRateLimit: () => void
  checkRateLimit: () => boolean

  // Processing state
  setProcessing: (processing: boolean) => void
  setError: (error: string | null) => void

  // Clear all AI data
  clearAll: () => void
}

export const useAIStore = create<AIStore>((set, get) => ({
  // Initial state
  isParsingEnabled: true,
  parseResult: null,
  studyTips: {},
  suggestions: {},
  rateLimit: {
    requestCount: 0,
    lastReset: new Date(),
    isLimited: false,
  },
  isProcessing: false,
  lastError: null,

  // Parsing actions
  setParsingEnabled: (enabled: boolean) => set({ isParsingEnabled: enabled }),

  setParseResult: (result: NLPParseResult | null) => set({ parseResult: result }),

  clearParseResult: () => set({ parseResult: null }),

  // Study tips actions
  setStudyTips: (assignmentId: string, tips: StudyTipsResponse) =>
    set((state) => ({
      studyTips: { ...state.studyTips, [assignmentId]: tips },
    })),

  getStudyTips: (assignmentId: string) => get().studyTips[assignmentId],

  clearStudyTips: (assignmentId: string) =>
    set((state) => {
      const { [assignmentId]: _, ...rest } = state.studyTips
      return { studyTips: rest }
    }),

  // Suggestion actions
  setSuggestion: (assignmentId: string, suggestion: DeadlineSuggestion) =>
    set((state) => ({
      suggestions: { ...state.suggestions, [assignmentId]: suggestion },
    })),

  getSuggestion: (assignmentId: string) => get().suggestions[assignmentId],

  clearSuggestion: (assignmentId: string) =>
    set((state) => {
      const { [assignmentId]: _, ...rest } = state.suggestions
      return { suggestions: rest }
    }),

  // Rate limit actions
  incrementRequestCount: () =>
    set((state) => {
      const now = new Date()
      const timeSinceReset = now.getTime() - state.rateLimit.lastReset.getTime()
      const oneMinute = 60 * 1000

      // Reset if more than 1 minute has passed
      if (timeSinceReset >= oneMinute) {
        return {
          rateLimit: {
            requestCount: 1,
            lastReset: now,
            isLimited: false,
          },
        }
      }

      const newCount = state.rateLimit.requestCount + 1
      const isLimited = newCount >= 15 // 15 requests per minute

      return {
        rateLimit: {
          ...state.rateLimit,
          requestCount: newCount,
          isLimited,
        },
      }
    }),

  resetRateLimit: () =>
    set({
      rateLimit: {
        requestCount: 0,
        lastReset: new Date(),
        isLimited: false,
      },
    }),

  checkRateLimit: () => {
    const { rateLimit } = get()
    const now = new Date()
    const timeSinceReset = now.getTime() - rateLimit.lastReset.getTime()
    const oneMinute = 60 * 1000

    // Reset if more than 1 minute has passed
    if (timeSinceReset >= oneMinute) {
      get().resetRateLimit()
      return true
    }

    return !rateLimit.isLimited
  },

  // Processing state
  setProcessing: (processing: boolean) => set({ isProcessing: processing }),

  setError: (error: string | null) => set({ lastError: error }),

  // Clear all AI data
  clearAll: () =>
    set({
      parseResult: null,
      studyTips: {},
      suggestions: {},
      lastError: null,
    }),
}))
