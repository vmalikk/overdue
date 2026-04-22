'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAIStore } from '@/store/aiStore'
import { useUIStore } from '@/store/uiStore'
import { NLPParseResult } from '@/types/ai'

interface NLPInputProps {
  onParsed: (result: NLPParseResult) => void
  placeholder?: string
  className?: string
}

export function NLPInput({ onParsed, placeholder = 'e.g., ECE 306 lab due Friday 5pm', className = '' }: NLPInputProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isParsingEnabled, setParseResult, rateLimit } = useAIStore()

  const handleParse = useCallback(async () => {
    if (!input.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      const { apiKey } = useUIStore.getState()
      if (apiKey) {
        headers['x-gemini-api-key'] = apiKey
      }

      const response = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers,
        body: JSON.stringify({ input: input.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Rate limited. Try again in ${data.resetIn} seconds.`)
        } else if (response.status === 503) {
          // Fallback when AI is not configured
          const fallbackResult: NLPParseResult = {
            success: true,
            parsed: { title: input.trim() },
            confidence: 0,
            warnings: ['AI parsing unavailable. Using input as title.'],
            originalInput: input,
          }
          setParseResult(fallbackResult)
          onParsed(fallbackResult)
        } else {
          setError(data.error || 'Failed to parse input')
        }
        return
      }

      const result: NLPParseResult = {
        success: data.success,
        parsed: data.parsed,
        confidence: data.confidence,
        warnings: data.warnings,
        originalInput: data.originalInput,
      }

      setParseResult(result)
      onParsed(result)
      setInput('')
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Parse error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [input, setParseResult, onParsed])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleParse()
    }
  }

  if (!isParsingEnabled) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">
            ✨ AI
          </span>
        </div>
        <Button
          onClick={handleParse}
          disabled={isLoading || !input.trim()}
          size="sm"
          variant="primary"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Parsing...
            </span>
          ) : (
            'Parse'
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-status-red">{error}</p>
      )}

      {rateLimit.isLimited && (
        <p className="text-xs text-text-muted">
          Rate limited. Requests reset every minute.
        </p>
      )}
    </div>
  )
}
