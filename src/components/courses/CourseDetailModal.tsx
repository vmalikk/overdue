'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Course, GradedItem, GradeWeight } from '@/types/course'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import clsx from 'clsx'

interface CourseDetailModalProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
}

export function CourseDetailModal({ course, isOpen, onClose, onEdit }: CourseDetailModalProps) {
    const { updateCourse } = useCourseStore()
    const { showToast } = useUIStore()

    // Local state for the "Add Grade" form
    const [addingToCategory, setAddingToCategory] = useState<string | null>(null)
    const [newItemName, setNewItemName] = useState('')
    const [newItemScore, setNewItemScore] = useState('')
    const [newItemTotal, setNewItemTotal] = useState('100')

    // Local state for editing weights
    const [isEditingWeights, setIsEditingWeights] = useState(false)
    const [editedWeights, setEditedWeights] = useState<GradeWeight[]>([])

    // Initialize edited weights when opening
    useMemo(() => {
        if (course?.gradeWeights) {
            setEditedWeights([...course.gradeWeights])
        } else {
            setEditedWeights([])
        }
    }, [course])

    if (!course) return null

    // --- Calculations ---
    const calculateCategoryGrade = (category: string) => {
        const items = course.gradedItems?.filter(i => i.category === category) || []
        if (items.length === 0) return null
        
        const totalScore = items.reduce((acc, item) => acc + (item.score / item.total), 0)
        return (totalScore / items.length) * 100
    }

    const calculateTotalGrade = () => {
        if (!course.gradeWeights || course.gradeWeights.length === 0) return null
        
        let totalWeight = 0
        let weightedSum = 0

        course.gradeWeights.forEach(gw => {
            const catGrade = calculateCategoryGrade(gw.category)
            if (catGrade !== null) {
                weightedSum += catGrade * (gw.weight / 100)
                totalWeight += gw.weight
            }
        })

        if (totalWeight === 0) return 0
        return (weightedSum / (totalWeight / 100))
    }

    const currentGrade = calculateTotalGrade()

    // --- Handlers ---
    const generateId = () => Math.random().toString(36).substring(2, 9)

    const handleAddWeight = () => {
        setEditedWeights([...editedWeights, { category: 'New Category', weight: 0 }])
    }

    const handleUpdateWeight = (index: number, field: keyof GradeWeight, value: string | number) => {
        const newWeights = [...editedWeights]
        newWeights[index] = { ...newWeights[index], [field]: value }
        setEditedWeights(newWeights)
    }

    const handleRemoveWeight = (index: number) => {
        const newWeights = [...editedWeights]
        newWeights.splice(index, 1)
        setEditedWeights(newWeights)
    }

    const saveWeights = async () => {
        const total = editedWeights.reduce((sum, w) => sum + Number(w.weight), 0)
        if (Math.abs(total - 100) > 1) {
            showToast(`Total weight is ${total}%, should be close to 100%`, 'warning')
        }
        
        await updateCourse(course.id, { gradeWeights: editedWeights })
        setIsEditingWeights(false)
        showToast('Grading scheme updated', 'success')
    }

    const startAddGrade = (category: string) => {
        setAddingToCategory(category)
        setNewItemName('')
        setNewItemScore('')
        setNewItemTotal('100')
    }

    const saveGrade = async () => {
        if (!addingToCategory || !newItemName || !newItemScore) return

        const newItem: GradedItem = {
            id: generateId(),
            category: addingToCategory,
            name: newItemName,
            score: Number(newItemScore),
            total: Number(newItemTotal) || 100
        }

        const currentItems = course.gradedItems || []
        await updateCourse(course.id, { gradedItems: [...currentItems, newItem] })
        
        setAddingToCategory(null)
        showToast('Grade added', 'success')
    }
    
    const deleteGrade = async (itemId: string) => {
        const currentItems = course.gradedItems || []
        await updateCourse(course.id, { gradedItems: currentItems.filter(i => i.id !== itemId) })
        showToast('Grade removed', 'success')
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className="flex flex-col h-full md:flex-row gap-6 p-2">
                
                {/* Left Column: Course Info & Stats */}
                <div className="md:w-1/4 space-y-6 border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0 md:pr-6 overflow-y-auto">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: course.color }} />
                            <h2 className="text-2xl font-bold text-text-primary">{course.code}</h2>
                        </div>
                        <h3 className="text-lg text-text-secondary">{course.name}</h3>
                    </div>

                    <div className="bg-surface p-4 rounded-xl border border-border">
                         <div className="text-text-muted text-sm uppercase tracking-wider mb-1">Current Grade</div>
                         <div className={clsx("text-4xl font-bold", 
                            currentGrade && currentGrade >= 90 ? "text-green-500" :
                            currentGrade && currentGrade >= 80 ? "text-blue-500" :
                            currentGrade && currentGrade >= 70 ? "text-yellow-500" :
                            "text-text-primary"
                         )}>
                            {currentGrade !== null ? `${currentGrade.toFixed(1)}%` : 'N/A'}
                         </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Instructor</h4>
                             <p className="font-medium text-text-primary">{course.instructor || 'None'}</p>
                             {course.professorEmail && (
                                <a href={`mailto:${course.professorEmail}`} className="text-sm text-primary hover:underline block truncate">
                                    {course.professorEmail}
                                </a>
                             )}
                        </div>

                         {course.officeHours && course.officeHours.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Office Hours</h4>
                                <div className="space-y-2">
                                    {course.officeHours.map((oh, i) => (
                                        <div key={i} className="text-sm bg-surface-hover p-2 rounded border border-border">
                                            <div className="font-medium">{oh.day}</div>
                                            <div className="text-text-secondary">{oh.startTime} - {oh.endTime}</div>
                                            <div className="text-xs text-text-muted">{oh.location}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {course.description && (
                            <div>
                                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">About</h4>
                                <p className="text-sm text-text-secondary leading-relaxed">{course.description}</p>
                            </div>
                        )}
                        
                        <div className="pt-4">
                            {onEdit && <Button variant="secondary" className="w-full" onClick={onEdit}>Edit Course Details</Button>}
                        </div>
                    </div>
                </div>

                {/* Right Column: Grading */}
                <div className="md:w-3/4 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-text-primary">Grading Breakdown</h3>
                        <div className="flex gap-2">
                            {isEditingWeights ? (
                                <>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingWeights(false)}>Cancel</Button>
                                    <Button size="sm" onClick={saveWeights}>Save Weights</Button>
                                </>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => setIsEditingWeights(true)}>Edit Categories</Button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                        
                        {/* Weight Editor */}
                        {isEditingWeights && (
                            <div className="bg-surface border border-border p-4 rounded-xl space-y-3 mb-6">
                                <h4 className="font-semibold text-text-primary mb-2">Edit Categories & Weights</h4>
                                {editedWeights.map((gw, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <Input 
                                            value={gw.category} 
                                            onChange={(e) => handleUpdateWeight(idx, 'category', e.target.value)}
                                            placeholder="Category Name"
                                            className="flex-1"
                                        />
                                        <div className="flex items-center gap-1 w-24">
                                            <Input 
                                                type="number"
                                                value={gw.weight} 
                                                onChange={(e) => handleUpdateWeight(idx, 'weight', Number(e.target.value))}
                                            />
                                            <span className="text-text-muted">%</span>
                                        </div>
                                        <button onClick={() => handleRemoveWeight(idx)} className="text-red-500 hover:text-red-400 p-2">
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <Button size="sm" variant="secondary" onClick={handleAddWeight} className="mt-2">+ Add Category</Button>
                            </div>
                        )}

                        {/* Grading Categories */}
                        {!course.gradeWeights || course.gradeWeights.length === 0 ? (
                            <div className="text-center py-12 text-text-muted">
                                <p>No grading categories defined.</p>
                                <Button variant="link" onClick={() => setIsEditingWeights(true)}>Set up grading scheme</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                                {course.gradeWeights.map((gw, idx) => {
                                    const catGrade = calculateCategoryGrade(gw.category)
                                    const items = course.gradedItems?.filter(i => i.category === gw.category) || []

                                    return (
                                        <div key={idx} className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col h-fit">
                                            <div className="p-4 bg-surface-hover border-b border-border flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-text-primary">{gw.category}</h4>
                                                    <span className="text-xs text-text-muted font-mono">{gw.weight}% of grade</span>
                                                </div>
                                                <div className="text-lg font-bold text-text-primary">
                                                    {catGrade !== null ? `${catGrade.toFixed(1)}%` : '-'}
                                                </div>
                                            </div>
                                            
                                            <div className="p-4 flex-1 space-y-3">
                                                {items.length === 0 && (
                                                    <p className="text-sm text-text-muted italic text-center py-2">No grades entered</p>
                                                )}
                                                
                                                {items.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center text-sm group">
                                                        <span className="text-text-secondary">{item.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono">{item.score}/{item.total}</span>
                                                            <button 
                                                                onClick={() => deleteGrade(item.id)}
                                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Add Item Form */}
                                                {addingToCategory === gw.category ? (
                                                     <div className="mt-3 bg-background p-3 rounded border border-border animate-in fade-in slide-in-from-top-2">
                                                        <Input 
                                                            autoFocus
                                                            placeholder="Name (e.g. Quiz 1)" 
                                                            className="mb-2 text-sm"
                                                            value={newItemName}
                                                            onChange={(e) => setNewItemName(e.target.value)}
                                                        />
                                                        <div className="flex gap-2 items-center mb-2">
                                                            <Input 
                                                                type="number" 
                                                                placeholder="Score" 
                                                                className="w-20 text-sm"
                                                                value={newItemScore}
                                                                onChange={(e) => setNewItemScore(e.target.value)}
                                                            />
                                                            <span className="text-text-muted">/</span>
                                                            <Input 
                                                                type="number" 
                                                                placeholder="Total" 
                                                                className="w-20 text-sm"
                                                                value={newItemTotal}
                                                                onChange={(e) => setNewItemTotal(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" variant="ghost" onClick={() => setAddingToCategory(null)}>Cancel</Button>
                                                            <Button size="sm" onClick={saveGrade}>Save</Button>
                                                        </div>
                                                     </div>
                                                ) : (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="w-full mt-2 text-text-muted hover:text-primary border border-dashed border-border hover:border-primary"
                                                        onClick={() => startAddGrade(gw.category)}
                                                    >
                                                        + Add Grade
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}
