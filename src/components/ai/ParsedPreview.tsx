'use client'

import { useState } from 'react'
import { NLPParseResult } from '@/types/ai'
import { Button } from '@/components/ui/Button'
import { useCourseStore } from '@/store/courseStore'
import { format } from 'date-fns'

interface ParsedPreviewProps {
  result: NLPParseResult
  onAccept: () => void
  onEdit: () => void
  onReject: () => void
}

export function ParsedPreview({ result, onAccept, onEdit, onReject }: ParsedPreviewProps) {
  const { courses, getCourseByCode } = useCourseStore()
  
  const parsed = result.parsed
  const matchedCourse = parsed.courseCode ? getCourseByCode(parsed.courseCode) : null

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-status-green'
    if (confidence >= 0.5) return 'text-status-yellow'
    return 'text-status-red'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High confidence'
    if (confidence >= 0.5) return 'Medium confidence'
    return 'Low confidence'
  }

  return (
    <div className="bg-accent border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
          ✨ AI Parsed Assignment
          <span className={`text-xs ${getConfidenceColor(result.confidence)}`}>
            ({getConfidenceLabel(result.confidence)})
          </span>
        </h4>
        <span className="text-xs text-text-muted">
          {Math.round(result.confidence * 100)}% confident
        </span>
      </div>

      {/* Parsed Fields */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-text-muted text-xs">Title</span>
          <p className="text-text-primary font-medium">{parsed.title}</p>
        </div>

        {parsed.courseCode && (
          <div>
            <span className="text-text-muted text-xs">Course</span>
            <div className="flex items-center gap-2">
              {matchedCourse ? (
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ backgroundColor: matchedCourse.color + '20', color: matchedCourse.color }}
                >
                  {matchedCourse.code}
                </span>
              ) : (
                <span className="text-text-secondary">{parsed.courseCode}</span>
              )}
              {!matchedCourse && (
                <span className="text-xs text-status-yellow">Course not found</span>
              )}
            </div>
          </div>
        )}

        {parsed.deadline && (
          <div>
            <span className="text-text-muted text-xs">Deadline</span>
            <p className="text-text-primary">
              {format(new Date(parsed.deadline), 'PPp')}
            </p>
          </div>
        )}


      </div>

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="bg-status-yellow/10 border border-status-yellow/30 rounded p-2">
          <p className="text-xs text-status-yellow font-medium mb-1">⚠️ Notes:</p>
          <ul className="text-xs text-text-muted space-y-1">
            {result.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button onClick={onAccept} variant="primary" size="sm">
          ✓ Accept & Create
        </Button>
        <Button onClick={onEdit} variant="secondary" size="sm">
          ✏️ Edit Details
        </Button>
        <Button onClick={onReject} variant="ghost" size="sm">
          ✕ Cancel
        </Button>
      </div>
    </div>
  )
}
