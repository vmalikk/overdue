'use client'

import { useState, useMemo, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Course, GradedItem, GradeWeight } from '@/types/course'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { useNextcloudStore, NextcloudItem } from '@/store/nextcloudStore'
import clsx from 'clsx'

interface CourseDetailModalProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
}

export function CourseDetailModal({ course, isOpen, onClose, onEdit }: CourseDetailModalProps) {
    const { updateCourse } = useCourseStore()
    const { showToast, devUnlocked } = useUIStore()
    const nextcloud = useNextcloudStore()

    // State for view navigation
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    // Local state for the "Add Grade" form
    const [isAddingGrade, setIsAddingGrade] = useState(false)
    const [newItemName, setNewItemName] = useState('')
    const [newItemScore, setNewItemScore] = useState('')
    const [newItemTotal, setNewItemTotal] = useState('100')

    // Local state for editing weights
    const [isEditingWeights, setIsEditingWeights] = useState(false)
    const [editedWeights, setEditedWeights] = useState<GradeWeight[]>([])

    // Nextcloud folder browser state
    const [ncItems, setNcItems] = useState<NextcloudItem[]>([])
    const [ncPath, setNcPath] = useState('')
    const [ncLoading, setNcLoading] = useState(false)
    const [ncExpanded, setNcExpanded] = useState(false)

    // Initialize edited weights when opening
    useMemo(() => {
        if (course?.gradeWeights) {
            setEditedWeights([...course.gradeWeights])
        } else {
            setEditedWeights([])
        }
    }, [course])

    // Reset view state when modal is closed
    useEffect(() => {
        if (!isOpen) {
            setActiveCategory(null)
            setIsAddingGrade(false)
            setNcExpanded(false)
            setNcItems([])
            setNcPath('')
        }
    }, [isOpen])

    // Load Nextcloud folder when expanded
    const loadNcFolder = async (path: string) => {
        setNcLoading(true)
        try {
            const items = await nextcloud.listFiles(path)
            setNcItems(items)
            setNcPath(path)
        } finally {
            setNcLoading(false)
        }
    }

    const handleNcExpand = () => {
        if (!ncExpanded && course) {
            const safeName = (course.name || course.code).replace(/[^a-zA-Z0-9 _\-]/g, '').trim()
            loadNcFolder(`/Overdue/${safeName}`)
        }
        setNcExpanded(!ncExpanded)
    }

    const navigateToFolder = (path: string) => {
        loadNcFolder(path)
    }

    const navigateUp = () => {
        const parent = ncPath.substring(0, ncPath.lastIndexOf('/')) || '/Overdue'
        if (parent.startsWith('/Overdue')) {
            loadNcFolder(parent)
        }
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return ''
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

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
        setIsAddingGrade(true)
        setNewItemName('')
        setNewItemScore('')
        setNewItemTotal('100')
    }

    const saveGrade = async () => {
        if (!activeCategory || !newItemName || !newItemScore) return

        const newItem: GradedItem = {
            id: generateId(),
            category: activeCategory,
            name: newItemName,
            score: Number(newItemScore),
            total: Number(newItemTotal) || 100
        }

        const currentItems = course.gradedItems || []
        await updateCourse(course.id, { gradedItems: [...currentItems, newItem] })
        
        setIsAddingGrade(false)
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

                        {/* Nextcloud Folder Browser */}
                        {devUnlocked && nextcloud.isConnected && (
                            <div className="pt-2">
                                <button
                                    onClick={handleNcExpand}
                                    className="w-full flex items-center justify-between text-sm font-semibold text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                        Nextcloud Files
                                    </span>
                                    <svg className={`w-4 h-4 transition-transform ${ncExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>

                                {ncExpanded && (
                                    <div className="mt-2 bg-surface border border-border rounded-lg overflow-hidden">
                                        {/* Path breadcrumb & back */}
                                        <div className="flex items-center gap-1 px-3 py-2 bg-background text-xs text-text-muted border-b border-border">
                                            {ncPath !== `/Overdue/${(course?.name || course?.code || '').replace(/[^a-zA-Z0-9 _\-]/g, '').trim()}` && (
                                                <button onClick={navigateUp} className="hover:text-text-primary mr-1" title="Go up">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                </button>
                                            )}
                                            <span className="truncate">{ncPath.replace('/Overdue/', '')}</span>
                                        </div>

                                        {ncLoading ? (
                                            <div className="flex items-center justify-center py-6 text-text-muted text-sm">
                                                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                Loading...
                                            </div>
                                        ) : ncItems.length === 0 ? (
                                            <div className="text-center py-6 text-text-muted text-sm">No files yet</div>
                                        ) : (
                                            <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                                                {ncItems
                                                    .sort((a, b) => {
                                                        if (a.type === 'directory' && b.type !== 'directory') return -1
                                                        if (a.type !== 'directory' && b.type === 'directory') return 1
                                                        return a.name.localeCompare(b.name)
                                                    })
                                                    .map((item) => (
                                                        <li key={item.path}>
                                                            {item.type === 'directory' ? (
                                                                <button
                                                                    onClick={() => navigateToFolder(item.path)}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-background transition-colors text-left"
                                                                >
                                                                    <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                                                    <span className="truncate">{item.name}</span>
                                                                </button>
                                                            ) : (
                                                                <a
                                                                    href={`${nextcloud.url}/apps/files/?dir=${encodeURIComponent(item.path.substring(0, item.path.lastIndexOf('/')))}&scrollto=${encodeURIComponent(item.name)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-background hover:text-accent transition-colors cursor-pointer"
                                                                >
                                                                    <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                                    <span className="truncate flex-1">{item.name}</span>
                                                                    {item.size != null && (
                                                                        <span className="text-xs text-text-muted shrink-0">{formatFileSize(item.size)}</span>
                                                                    )}
                                                                    <svg className="w-3.5 h-3.5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                </a>
                                                            )}
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
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
                                <Button size="sm" variant="secondary" onClick={() => setIsEditingWeights(true)}>Edit Categories</Button>
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
                                <Button variant="ghost" className="text-primary hover:underline" onClick={() => setIsEditingWeights(true)}>Set up grading scheme</Button>
                            </div>
                        ) : activeCategory ? (
                             // CATEGORY DETAIL VIEW
                             <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                                <Button variant="ghost" size="sm" onClick={() => setActiveCategory(null)} className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                                    ← Back to Overview
                                </Button>
                                
                                {(() => {
                                    const gw = course.gradeWeights.find(w => w.category === activeCategory)
                                    if (!gw) return null;
                                    
                                    const catGrade = calculateCategoryGrade(gw.category)
                                    const items = course.gradedItems?.filter(i => i.category === gw.category) || []

                                    return (
                                        <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
                                            <div className="p-6 bg-surface-hover border-b border-border flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-2xl font-bold text-text-primary">{gw.category}</h4>
                                                    <span className="text-sm text-text-muted font-mono">{gw.weight}% of total grade</span>
                                                </div>
                                                <div className="text-3xl font-bold text-text-primary">
                                                    {catGrade !== null ? `${catGrade.toFixed(1)}%` : '-'}
                                                </div>
                                            </div>
                                            
                                            <div className="p-6 flex-1 space-y-4">
                                                {items.length === 0 && !isAddingGrade && (
                                                    <div className="text-center py-8 text-text-muted">
                                                        <p>No grades entered for {gw.category}.</p>
                                                        <Button onClick={() => startAddGrade(gw.category)} className="mt-4">Add {gw.category} Grade</Button>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    {items.map(item => (
                                                        <div key={item.id} className="flex justify-between items-center p-3 bg-background rounded-lg border border-border group hover:border-primary/50 transition-colors">
                                                            <span className="font-medium text-text-primary">{item.name}</span>
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-right">
                                                                    <div className="font-mono font-bold text-text-primary">
                                                                        {item.score}/{item.total}
                                                                    </div>
                                                                    <div className="text-xs text-text-muted">
                                                                        {((item.score / item.total) * 100).toFixed(1)}%
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => deleteGrade(item.id)}
                                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded transition-all"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add Item Form */}
                                                {isAddingGrade && (
                                                     <div className="mt-4 bg-background p-4 rounded-lg border border-primary/50 animate-in fade-in slide-in-from-top-2">
                                                        <Input 
                                                            autoFocus
                                                            placeholder="Assignment Name (e.g. Quiz 3)" 
                                                            className="mb-3"
                                                            value={newItemName}
                                                            onChange={(e) => setNewItemName(e.target.value)}
                                                        />
                                                        <div className="flex gap-3 items-center mb-3">
                                                            <div className="flex-1">
                                                                <label className="text-xs text-text-muted mb-1 block">Score</label>
                                                                <Input 
                                                                    type="number" 
                                                                    placeholder="Score" 
                                                                    value={newItemScore}
                                                                    onChange={(e) => setNewItemScore(e.target.value)}
                                                                />
                                                            </div>
                                                            <span className="text-text-muted pt-6">/</span>
                                                            <div className="flex-1">
                                                                <label className="text-xs text-text-muted mb-1 block">Total Possible</label>
                                                                <Input 
                                                                    type="number" 
                                                                    placeholder="Total" 
                                                                    value={newItemTotal}
                                                                    onChange={(e) => setNewItemTotal(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button variant="ghost" onClick={() => setIsAddingGrade(false)}>Cancel</Button>
                                                            <Button onClick={saveGrade}>Save Grade</Button>
                                                        </div>
                                                     </div>
                                                )}

                                                {!isAddingGrade && items.length > 0 && (
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full py-6 mt-4 dashed border border-dashed border-border hover:border-primary hover:text-primary"
                                                        onClick={() => startAddGrade(gw.category)}
                                                    >
                                                        + Add Another Grade
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })()}
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12 animate-in fade-in slide-in-from-left-4 duration-200">
                                {course.gradeWeights.map((gw, idx) => {
                                    const catGrade = calculateCategoryGrade(gw.category)
                                    const items = course.gradedItems?.filter(i => i.category === gw.category) || []

                                    return (
                                        <div 
                                            key={idx} 
                                            className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary cursor-pointer transition-all shadow-sm hover:shadow-md group"
                                            onClick={() => setActiveCategory(gw.category)}
                                        >
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-xl text-text-primary group-hover:text-primary transition-colors">{gw.category}</h4>
                                                        <span className="text-sm text-text-muted font-mono bg-secondary px-2 py-0.5 rounded">{gw.weight}% weight</span>
                                                    </div>
                                                    <div className="text-2xl font-bold text-text-primary">
                                                        {catGrade !== null ? `${catGrade.toFixed(1)}%` : '-'}
                                                    </div>
                                                </div>
                                                
                                                <div className="text-sm text-text-secondary flex justify-between items-center mt-4">
                                                    <span>{items.length} graded item{items.length !== 1 ? 's' : ''}</span>
                                                    <span className="text-primary text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Manage Grades →
                                                    </span>
                                                </div>
                                                
                                                {/* Mini progress bar or visual indicator */}
                                                <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div 
                                                        className={clsx("h-full rounded-full transition-all duration-500", 
                                                            catGrade && catGrade >= 90 ? "bg-green-500" :
                                                            catGrade && catGrade >= 80 ? "bg-blue-500" :
                                                            catGrade && catGrade >= 70 ? "bg-yellow-500" :
                                                            "bg-text-muted"
                                                        )}
                                                        style={{ width: catGrade ? `${catGrade}%` : '0%' }}
                                                    />
                                                </div>
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
