'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Course } from '@/types/course'
import { useState, useEffect } from 'react'
import { useCourseStore } from '@/store/courseStore'
import { Input } from '@/components/ui/Input'
import clsx from 'clsx'

interface CourseDetailModalProps {
    course: Course | null
    isOpen: boolean
    onClose: () => void
    onEdit?: () => void
}

type Tab = 'info' | 'grades'

export function CourseDetailModal({ course, isOpen, onClose, onEdit }: CourseDetailModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('info')
    const [scores, setScores] = useState<Record<string, number>>({})
    const [targetGrade, setTargetGrade] = useState<string>('90')
    const { updateCourse } = useCourseStore()

    // Reset state when course opens
    useEffect(() => {
        if (course) {
            setScores(course.categoryScores || {})
            setActiveTab('info')
        }
    }, [course, isOpen])

    if (!course) return null

    const handleScoreChange = async (category: string, value: string) => {
        const numValue = parseFloat(value)
        const newScores = { ...scores }

        if (isNaN(numValue)) {
            delete newScores[category]
        } else {
            newScores[category] = numValue
        }

        setScores(newScores)

        // Auto-save to DB (debounce could be better, but direct save is fine for low frequency)
        // We only save valid numbers to DB
        await updateCourse(course.id, { categoryScores: newScores })
    }

    // --- CALCULATOR LOGIC ---
    const calculateCurrentGrade = () => {
        if (!course.gradeWeights) return { current: 0, totalWeightReferenced: 0 }

        let totalWeightedScore = 0
        let totalWeightReferenced = 0

        course.gradeWeights.forEach(gw => {
            const score = scores[gw.category]
            if (score !== undefined) {
                totalWeightedScore += (score * (gw.weight / 100))
                totalWeightReferenced += gw.weight
            }
        })

        // Normalize: If we've only done 20% of the course, and got 100% on it, our current grade is 100%, not 20%.
        const current = totalWeightReferenced > 0
            ? (totalWeightedScore / (totalWeightReferenced / 100))
            : 0

        return { current, totalWeightReferenced }
    }

    const { current, totalWeightReferenced } = calculateCurrentGrade()
    const remainingWeight = 100 - totalWeightReferenced

    const calculateRequiredAverage = () => {
        const target = parseFloat(targetGrade)
        if (isNaN(target) || remainingWeight <= 0) return null

        // Math: (CurrentWeighted + (Required * RemainingWeight%)) = Target
        // Required * RemainingWeight% = Target - CurrentWeighted
        // Required = (Target - CurrentWeighted) / (RemainingWeight / 100)

        // Note: We need the NON-normalized current weighted score here.
        // e.g. if we have 20% weight done at 100% score, currentWeighted is 20 points.
        let currentWeightedPoints = 0
        course.gradeWeights?.forEach(gw => {
            const score = scores[gw.category]
            if (score !== undefined) {
                currentWeightedPoints += (score * (gw.weight / 100))
            }
        })

        const required = (target - currentWeightedPoints) / (remainingWeight / 100)
        return required
    }

    const requiredAvg = calculateRequiredAverage()

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={course.code}>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border mb-6">
                <button
                    className={clsx(
                        "pb-2 px-1 text-sm font-medium transition-colors relative",
                        activeTab === 'info' ? "text-primary" : "text-text-muted hover:text-text-primary"
                    )}
                    onClick={() => setActiveTab('info')}
                >
                    Info
                    {activeTab === 'info' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
                <button
                    className={clsx(
                        "pb-2 px-1 text-sm font-medium transition-colors relative",
                        activeTab === 'grades' ? "text-primary" : "text-text-muted hover:text-text-primary"
                    )}
                    onClick={() => setActiveTab('grades')}
                >
                    Grades & Calculator
                    {activeTab === 'grades' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
            </div>

            <div className="space-y-6">

                {/* --- INFO TAB --- */}
                {activeTab === 'info' && (
                    <>
                        {/* Header with Color and Name */}
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: course.color }} />
                            <h3 className="text-xl font-bold text-text-primary">{course.name}</h3>
                        </div>

                        {/* Instructor Info */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Instructor</h4>
                            <p className="text-text-primary">{course.instructor || 'Not specified'}</p>
                            {course.professorEmail && (
                                <p className="text-sm text-primary hover:underline">
                                    <a href={`mailto:${course.professorEmail}`}>{course.professorEmail}</a>
                                </p>
                            )}
                        </div>

                        {/* Office Hours */}
                        {course.officeHours && course.officeHours.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Office Hours</h4>
                                <div className="grid gap-2">
                                    {course.officeHours.map((oh, i) => (
                                        <div key={i} className="bg-surface-hover p-3 rounded-md text-sm border border-border">
                                            <div className="font-medium text-text-primary">{oh.day}</div>
                                            <div className="text-text-secondary">{oh.startTime} - {oh.endTime}</div>
                                            <div className="text-text-muted text-xs mt-1">{oh.location}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {course.description && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Description</h4>
                                <p className="text-sm text-text-secondary">{course.description}</p>
                            </div>
                        )}
                    </>
                )}

                {/* --- GRADES TAB --- */}
                {activeTab === 'grades' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {(!course.gradeWeights || course.gradeWeights.length === 0) ? (
                            <div className="text-center py-8 text-text-muted bg-surface-hover rounded-lg border border-border">
                                <p>No grade weights configured for this course.</p>
                                <Button variant="ghost" size="sm" onClick={onEdit} className="mt-2 text-primary">Edit Course to Add Weights</Button>
                            </div>
                        ) : (
                            <>
                                {/* Current Standing Card */}
                                <div className="bg-surface-hover border border-border rounded-lg p-5 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-1">Current Standing</h4>
                                        <div className="text-3xl font-bold text-text-primary">{current.toFixed(1)}%</div>
                                        <p className="text-xs text-text-muted mt-1">Based on {totalWeightReferenced}% of graded coursework</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${current >= 90 ? 'bg-green-100 text-green-700' :
                                        current >= 80 ? 'bg-blue-100 text-blue-700' :
                                            current >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                        }`}>
                                        {current >= 90 ? 'A' : current >= 80 ? 'B' : current >= 70 ? 'C' : 'F'}
                                    </div>
                                </div>

                                {/* Grade Entry Table */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Enter Your Scores</h4>
                                    <div className="border border-border rounded-lg overflow-hidden">
                                        {course.gradeWeights.map((gw, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                                                <div className="flex-1">
                                                    <div className="font-medium text-text-primary">{gw.category}</div>
                                                    <div className="text-xs text-text-muted">Weight: {gw.weight}%</div>
                                                </div>
                                                <div className="w-24">
                                                    <Input
                                                        type="number"
                                                        placeholder="-%"
                                                        min="0" max="100"
                                                        className="text-right font-mono"
                                                        value={scores[gw.category] ?? ''}
                                                        onChange={(e) => handleScoreChange(gw.category, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Projection Calculator */}
                                {remainingWeight > 0 && (
                                    <div className="bg-gradient-to-br from-surface-hover to-background border border-border rounded-lg p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-text-primary">What do I need for a...</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-text-muted">Target:</span>
                                                <Input
                                                    type="number"
                                                    value={targetGrade}
                                                    onChange={(e) => setTargetGrade(e.target.value)}
                                                    className="w-16 h-8 text-center"
                                                />
                                                <span className="text-sm font-bold text-text-primary">%</span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/50">
                                            {requiredAvg === null ? (
                                                <div className="text-center text-text-muted text-sm">Enter a target grade</div>
                                            ) : (
                                                <div className="flex items-end justify-between">
                                                    <span className="text-sm text-text-secondary">You need to average:</span>
                                                    <div className="text-right">
                                                        <div className={clsx(
                                                            "text-2xl font-bold font-mono",
                                                            requiredAvg > 100 ? "text-priority-high" : "text-priority-low"
                                                        )}>
                                                            {requiredAvg.toFixed(1)}%
                                                        </div>
                                                        <div className="text-xs text-text-muted">on the remaining {remainingWeight}%</div>
                                                    </div>
                                                </div>
                                            )}
                                            {requiredAvg !== null && requiredAvg > 100 && (
                                                <p className="text-xs text-priority-high mt-2 text-right">
                                                    Warning: This is mathematically impossible without extra credit.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="pt-4 flex justify-end gap-2 border-t border-border mt-4">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    {activeTab === 'info' && onEdit && <Button onClick={onEdit}>Edit Course</Button>}
                </div>
            </div>
        </Modal>
    )
}
