'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { StudyTipsResponse } from '@/types/ai'
import { useAIStore } from '@/store/aiStore'
import { useUIStore } from '@/store/uiStore'
import { format } from 'date-fns'

interface StudyTipsProps {
  assignmentId: string
  title: string
  description?: string
  courseCode?: string
  deadline: Date
  estimatedHours?: number
}

export function StudyTips({
  assignmentId,
  title,
  description,
  courseCode,
  deadline,
  estimatedHours,
}: StudyTipsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const { studyTips, setStudyTips, getStudyTips } = useAIStore()
  const tips = getStudyTips(assignmentId)

  const fetchTips = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/gemini/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(useUIStore.getState().apiKey ? { 'x-gemini-api-key': useUIStore.getState().apiKey! } : {})
        },
        body: JSON.stringify({
          title,
          description,
          courseCode,
          deadline: deadline.toISOString(),
          estimatedHours,
          type: 'tips',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Rate limited. Try again in ${data.resetIn} seconds.`)
        } else if (response.status === 503 && data.fallback) {
          setStudyTips(assignmentId, data.tips)
        } else {
          setError(data.error || 'Failed to generate tips')
        }
        return
      }

      setStudyTips(assignmentId, data.tips)
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Tips fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-status-red/20 border-status-red text-status-red'
      case 'medium':
        return 'bg-status-yellow/20 border-status-yellow text-status-yellow'
      case 'low':
        return 'bg-status-green/20 border-status-green text-status-green'
      default:
        return 'bg-secondary border-border text-text-secondary'
    }
  }

  if (!tips && !isExpanded) {
    return (
      <Button
        onClick={() => {
          setIsExpanded(true)
          fetchTips()
        }}
        variant="ghost"
        size="sm"
        className="text-xs"
      >
        ✨ Get AI Study Tips
      </Button>
    )
  }

  return (
    <div className="mt-4 space-y-3 p-4 bg-accent rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
          ✨ AI Study Tips
        </h4>
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          variant="ghost"
          size="sm"
          className="text-xs"
        >
          {isExpanded ? 'Hide' : 'Show'}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-muted">
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
          Generating personalized tips...
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-status-red">{error}</p>
          <Button onClick={fetchTips} variant="ghost" size="sm">
            Retry
          </Button>
        </div>
      )}

      {tips && isExpanded && (
        <div className="space-y-4">
          {/* Warning Level */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${getWarningColor(
              tips.warningLevel
            )}`}
          >
            {tips.warningLevel === 'high' && '⚠️ Urgent'}
            {tips.warningLevel === 'medium' && '⏰ Moderate Priority'}
            {tips.warningLevel === 'low' && '✓ Good Pacing'}
          </div>

          {/* Tips List */}
          <div>
            <h5 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
              Tips
            </h5>
            <ul className="space-y-2">
              {tips.tips.map((tip, index) => (
                <li
                  key={index}
                  className="text-sm text-text-secondary flex items-start gap-2"
                >
                  <span className="text-primary mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Suggested Schedule */}
          {tips.suggestedSchedule && tips.suggestedSchedule.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
                Suggested Schedule
              </h5>
              <div className="space-y-2">
                {tips.suggestedSchedule.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-sm bg-secondary p-2 rounded"
                  >
                    <span className="text-text-muted text-xs font-mono">
                      {format(new Date(item.date), 'MMM d')}
                    </span>
                    <span className="text-text-secondary">{item.task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resource Suggestions */}
          {tips.resourceSuggestions && tips.resourceSuggestions.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
                Resources
              </h5>
              <div className="flex flex-wrap gap-2">
                {tips.resourceSuggestions.map((resource, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-secondary rounded text-text-secondary"
                  >
                    📚 {resource}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <Button onClick={fetchTips} variant="ghost" size="sm" className="text-xs">
            🔄 Refresh Tips
          </Button>
        </div>
      )}
    </div>
  )
}
