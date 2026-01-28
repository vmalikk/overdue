'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Course, GradeItem } from '@/types/course'
import { useState, useEffect } from 'react'
import { useCourseStore } from '@/store/courseStore'
import { Input } from '@/components/ui/Input'
import clsx from 'clsx'
import { ID } from 'appwrite'

interface CourseDetailModalProps {
    course: Course | null
    isOpen: boolean
    onClose: () => void
    onEdit?: () => void
}

type Tab = 'info' | 'grades'
type GradeView = 'summary' | 'detail'

export function CourseDetailModal({ course, isOpen, onClose, onEdit }: CourseDetailModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('info')

    // Grade Calculator State
    const [gradeView, setGradeView] = useState<GradeView>('summary')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    const [scores, setScores] = useState<Record<string, number>>({})
    const [gradeData, setGradeData] = useState<Record<string, GradeItem[]>>({})

    const [targetGrade, setTargetGrade] = useState<string>('90')
    const [newItemName, setNewItemName] = useState('')
    const [newItemScore, setNewItemScore] = useState('')
    const [newItemMax, setNewItemMax] = useState('100')

    const { updateCourse } = useCourseStore()

    // Reset state when course opens - FIX: Only reset when opening a DIFFERENT course
    useEffect(() => {
        if (course && isOpen) {
            setScores(course.categoryScores || {})
            setGradeData(course.gradeData || {})
            // Only set default tab if we are mounting or switching courses
            // We rely on the parent to unmount/remount or this effect to run on id change
        }
    }, [course?.id, isOpen])

    // Separate effect for tab reset on open
    useEffect(() => {
        if (isOpen) {
            setActiveTab('info')
            setGradeView('summary')
            setSelectedCategory(null)
        }
    }, [isOpen])

    if (!course) return null

    // --- SUMMARY VIEW ACTIONS ---
    const handleManualScoreChange = async (category: string, value: string) => {
        const numValue = parseFloat(value)
        const newScores = { ...scores }

        if (isNaN(numValue)) {
            delete newScores[category]
        } else {
            newScores[category] = numValue
        }

        setScores(newScores)
        await updateCourse(course.id, { categoryScores: newScores })
    }

    const openCategoryDetail = (category: string) => {
        setSelectedCategory(category)
        setGradeView('detail')
        setNewItemName('')
        setNewItemScore('')
        setNewItemMax('100')
    }

    // --- DETAIL VIEW ACTIONS ---
    const handleAddItem = async () => {
        if (!selectedCategory || !newItemName || !newItemScore || !newItemMax) return

        const newScore = parseFloat(newItemScore)
        const newMax = parseFloat(newItemMax)

        const newItem: GradeItem = {
            id: ID.unique(),
            name: newItemName,
            score: newScore,
            maxScore: newMax
        }

        const currentItems = gradeData[selectedCategory] || []
        const newItems = [...currentItems, newItem]

        await updateGradeData(selectedCategory, newItems)

        setNewItemName('')
        setNewItemScore('')
        setNewItemMax('100')
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!selectedCategory) return
        const currentItems = gradeData[selectedCategory] || []
        const newItems = currentItems.filter(item => item.id !== itemId)
        await updateGradeData(selectedCategory, newItems)
    }

    // Central update logic: Updates items AND recalculates the summary score
    const updateGradeData = async (category: string, newItems: GradeItem[]) => {
        const newGradeData = { ...gradeData, [category]: newItems }
        setGradeData(newGradeData) // Optimistic update

        // Recalculate Category Summary
        // Formula: (Total Points Earned / Total Points Possible) * 100
        let totalEarned = 0
        let totalPossible = 0

        newItems.forEach(item => {
            totalEarned += item.score
            totalPossible += item.maxScore
        })

        const newScores = { ...scores }
        if (totalPossible > 0) {
            const percentage = (totalEarned / totalPossible) * 100
            newScores[category] = parseFloat(percentage.toFixed(2))
        } else {
            // No items left, we don't delete the score automatically to preserve manual entry,
            // OR we delete it to signify "no data". Let's delete it if no items.
            delete newScores[category]
        }

        setScores(newScores)

        // Save everything
        await updateCourse(course.id, {
            gradeData: newGradeData,
            categoryScores: newScores
        })
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
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: course.color }} />
                            <h3 className="text-xl font-bold text-text-primary">{course.name}</h3>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Instructor</h4>
                            <p className="text-text-primary">{course.instructor || 'Not specified'}</p>
                            {course.professorEmail && (
                                <p className="text-sm text-primary hover:underline">
                                    <a href={`mailto:${course.professorEmail}`}>{course.professorEmail}</a>
                                </p>
                            )}
                        </div>

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

                        {/* CHECK WEIGHTS CONFIG */}
                        {(!course.gradeWeights || course.gradeWeights.length === 0) ? (
                            <div className="text-center py-8 text-text-muted bg-surface-hover rounded-lg border border-border">
                                <p>No grade weights configured for this course.</p>
                                <Button variant="ghost" size="sm" onClick={onEdit} className="mt-2 text-primary">Edit Course to Add Weights</Button>
                            </div>
                        ) : (
                            <>
                                {/* VIEW: SUMMARY */}
                                {gradeView === 'summary' && (
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
                                            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Categories</h4>
                                            <div className="border border-border rounded-lg overflow-hidden">
                                                {course.gradeWeights.map((gw, i) => {
                                                    const hasItems = (gradeData[gw.category]?.length || 0) > 0
                                                    return (
                                                        <div key={i} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-medium text-text-primary">{gw.category}</div>
                                                                    {hasItems && (
                                                                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-text-muted">
                                                                            {gradeData[gw.category]?.length} items
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-text-muted">Weight: {gw.weight}%</div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="w-20">
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="-%"
                                                                        min="0" max="100"
                                                                        className="text-right font-mono text-sm h-8"
                                                                        value={scores[gw.category] ?? ''}
                                                                        onChange={(e) => handleManualScoreChange(gw.category, e.target.value)}
                                                                        disabled={hasItems} // Disable manual entry if driven by items
                                                                    />
                                                                </div>
                                                                <Button variant="ghost" size="sm" onClick={() => openCategoryDetail(gw.category)}>
                                                                    Details
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
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
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* VIEW: DETAILS */}
                                {gradeView === 'detail' && selectedCategory && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Button variant="ghost" size="sm" onClick={() => setGradeView('summary')}>
                                                ← Back
                                            </Button>
                                            <h3 className="font-bold text-lg text-text-primary">{selectedCategory} Grades</h3>
                                        </div>

                                        {/* Add Item Form */}
                                        <div className="bg-surface-hover p-3 rounded-lg border border-border flex items-end gap-2">
                                            <div className="flex-1">
                                                <label className="text-xs text-text-muted mb-1 block">Name</label>
                                                <Input
                                                    placeholder="e.g. HW 1"
                                                    value={newItemName}
                                                    onChange={(e) => setNewItemName(e.target.value)}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="text-xs text-text-muted mb-1 block">Score</label>
                                                <Input
                                                    type="number"
                                                    placeholder="Score"
                                                    value={newItemScore}
                                                    onChange={(e) => setNewItemScore(e.target.value)}
                                                    className="h-9 text-right"
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="text-xs text-text-muted mb-1 block">Max</label>
                                                <Input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={newItemMax}
                                                    onChange={(e) => setNewItemMax(e.target.value)}
                                                    className="h-9 text-right"
                                                />
                                            </div>
                                            <Button size="sm" onClick={handleAddItem}>Add</Button>
                                        </div>

                                        {/* Items List */}
                                        <div className="space-y-2">
                                            {(gradeData[selectedCategory] || []).length === 0 ? (
                                                <div className="text-center py-8 text-text-muted text-sm">
                                                    No items added. <br />
                                                    The overall category score is currently <strong>manual</strong>.
                                                </div>
                                            ) : (
                                                (gradeData[selectedCategory] || []).map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-transparent">
                                                        <span className="font-medium text-text-primary">{item.name}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-mono text-sm text-text-secondary">
                                                                {item.score} / {item.maxScore}
                                                            </span>
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="text-text-muted hover:text-red-500 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="text-right text-sm text-text-muted pt-2 border-t border-border">
                                            Current {selectedCategory} Average: <strong className="text-text-primary">{scores[selectedCategory]}%</strong>
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
