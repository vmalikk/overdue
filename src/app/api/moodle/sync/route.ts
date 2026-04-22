import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createSessionClient } from '@/lib/appwrite/server'
import { decryptData } from '@/lib/moodle/encryption'
import { ID, Query } from 'node-appwrite'

const DATABASE_ID = "6971d0970008b1d89c01"
const ASSIGNMENTS_COLLECTION = "assignment"
const COURSES_COLLECTION = "courses"

// Helper to normalize strings for comparison
function normalize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper to update course grades (replicated from gradescope sync logic)
async function updateCourseGrades(databases: any, dbId: string, collId: string, courseId: string, title: string, grade: { score: number, total: number }, categoryHint?: string) {
    try {
        const course = await databases.getDocument(dbId, collId, courseId);
        let gradedItems = course.gradedItems ? JSON.parse(course.gradedItems) : [];
        if (!Array.isArray(gradedItems)) gradedItems = [];
        let gradeWeights = course.gradeWeights ? JSON.parse(course.gradeWeights) : [];

        // Check if item exists
        const existingIndex = gradedItems.findIndex((i: any) => i.name === title);
        
        let changed = false;
        if (existingIndex >= 0) {
            // Update if changed
            if (gradedItems[existingIndex].score !== grade.score || gradedItems[existingIndex].total !== grade.total) {
                gradedItems[existingIndex].score = grade.score;
                gradedItems[existingIndex].total = grade.total;
                changed = true;
            }
        } else {
            // Create
            let category = "Imported";
            
            // Try to match using categoryHint first
            let matchedCategory = false;
            if (categoryHint && gradeWeights.length > 0) {
                // normalized comparisons
                const hint = normalize(categoryHint);
                const weightMatch = gradeWeights.find((gw: any) => normalize(gw.category) === hint || hint.includes(normalize(gw.category)));
                if (weightMatch) {
                    category = weightMatch.category;
                    matchedCategory = true;
                }
            }

            if (!matchedCategory && gradeWeights && gradeWeights.length > 0) {
                 const match = gradeWeights.find((gw: any) => {
                     const c = gw.category.toLowerCase();
                     const t = title.toLowerCase();
                     if (t.includes(c)) return true;
                     if (c === 'quizzes' && t.includes('quiz')) return true;
                     if (c === 'tests' && t.includes('test')) return true;
                     if (c === 'exams' && (t.includes('exam') || t.includes('midterm') || t.includes('final'))) return true;
                     if (c === 'assignments' && (t.includes('assignment') || t.includes('hw') || t.includes('homework'))) return true;
                     if (c === 'homework' && (t.includes('hw') || t.includes('assignment'))) return true;
                     if (c === 'labs' && t.includes('lab')) return true;
                     if (c === 'projects' && t.includes('project')) return true;
                     if ((c === 'attendance' || c === 'participation') && (t.includes('attendance') || t.includes('participation'))) return true;
                     if (c.endsWith('s') && t.includes(c.slice(0, -1))) return true;
                     return false;
                 });
                 
                 if (match) {
                     category = match.category;
                 } else if (categoryHint) {
                     category = categoryHint;
                 } else {
                     // Heuristics for common categories even if not in weights
                     const t = title.toLowerCase();
                     if (t.includes('attendance') || t.includes('participation')) category = 'Attendance';
                     else if (t.includes('quiz')) category = 'Quizzes';
                     else if (t.includes('exam')) category = 'Exams';
                     else if (t.includes('project')) category = 'Projects';
                     else if (t.includes('lab')) category = 'Labs';
                     else category = gradeWeights[0].category; // Fallback to first weight as last resort
                 }
            } else if (!matchedCategory && categoryHint) {
                 category = categoryHint; // Use the Moodle category name if no weights defined
            } else if (!matchedCategory) {
                 // No weights, no hint: heuristic check
                 const t = title.toLowerCase();
                 if (t.includes('attendance') || t.includes('participation')) category = 'Attendance';
                 else if (t.includes('quiz')) category = 'Quizzes';
                 else category = "Imported";
            }

            gradedItems.push({
                id: Math.random().toString(36).substring(2, 9),
                category: category,
                name: title,
                score: grade.score,
                total: grade.total
            });
            changed = true;
        }

        if (changed) {
            await databases.updateDocument(dbId, collId, courseId, {
                gradedItems: JSON.stringify(gradedItems)
            });
            console.log(`Updated Moodle grades for course ${courseId}`);
        }
    } catch (e) {
        console.error("Failed to update grades for course", courseId, e);
    }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.prefs.moodleSessionData) {
        return NextResponse.json({ success: false, error: 'Moodle not connected' }, { status: 400 })
    }

    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
    };

    let moodleData;
    try {
        const decrypted = decryptData(user.prefs.moodleSessionData)
        moodleData = JSON.parse(decrypted)
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to decrypt session data' }, { status: 500 })
    }

    const { token, url, userid } = moodleData
    
    // Moodle API Helpers
    const moodleCall = async (wsfunction: string, params: Record<string, any> = {}) => {
        const query = new URLSearchParams()
        query.append('wstoken', token)
        query.append('wsfunction', wsfunction)
        query.append('moodlewsrestformat', 'json')
        
        // Append other params
        Object.entries(params).forEach(([key, value]) => {
           query.append(key, String(value))
        })

        const res = await fetch(`${url}/webservice/rest/server.php`, {
            method: 'POST',
            body: query
        })
        return res.json()
    }

    // 1. Fetch Courses
    // core_enrol_get_users_courses
    log(`Moodle Sync: Fetching courses for user ${userid}...`)
    const coursesData = await moodleCall('core_enrol_get_users_courses', { userid })
    
    if (coursesData.exception) {
        return NextResponse.json({ success: false, error: `Moodle Error: ${coursesData.message}` }, { status: 400 })
    }

    const courses = coursesData as any[]; // Array of courses
    log(`Moodle Sync: Found ${courses.length} courses`)

    // 2. Fetch Grades (NEW: Before Assignments)
    // gradereport_user_get_grade_items
    try {
        log(`Moodle Sync: Fetching grades...`)
        // Try getting grades for all courses. Some Moodle configs require courseid per call.
        // Let's iterate courses and fetch grades for linked courses
        for (const course of courses) {
             // Link to internal first to see if we care
             const mCodeClean = normalize(course.shortname);
             const mNameClean = normalize(course.fullname);
             let internalCourseId = '';
             let internalCourseCode = '';

             // Re-fetch or pass internalCourses? We need them.
             // We can't use internalCourses here easily because it's fetched later.
             // Let's assume we will filter later? No, better to fetch internal first.
        }
    } catch (e) {
        console.error("Moodle Grade Fetch Error", e);
    }
    
    // 3. Sync with Appwrite (MOVED UP to use for course linking in grade sync)
    const { databases } = await createSessionClient(request)
    
    // Fetch internal courses
    let internalCourses: any[] = [];
    try {
        const coursesRes = await databases.listDocuments(
            DATABASE_ID,
            COURSES_COLLECTION,
            [Query.equal('userId', user.$id)]
        );
        internalCourses = coursesRes.documents;
    } catch (e) {
        console.error('Failed to fetch internal courses', e)
    }

    // Now fetch grades
    let gradesUpdatedCount = 0;
    try {
        for (const course of courses) {
             // Check if this Moodle course matches an Internal Course
             const mCodeClean = normalize(course.shortname);
             const mNameClean = normalize(course.fullname);
             let internalCourseId = '';
             let matchedInternalCode = '';

             for (const internal of internalCourses) {
                const iCode = normalize(internal.code);
                const iName = normalize(internal.name);
                if (mCodeClean.includes(iCode) || iCode.includes(mCodeClean) || mNameClean === iName) {
                    internalCourseId = internal.$id;
                    matchedInternalCode = internal.code;
                    break;
                }
             }

             if (!internalCourseId) {
                  log(`Moodle Sync: [SKIP] Course "${course.shortname}" not found in Overdue.`);
                  continue; 
             }
             
             log(`Moodle Sync: Inspecting grades for ${course.shortname} (Linked to ${matchedInternalCode})...`);

             const gradeData = await moodleCall('gradereport_user_get_grade_items', { 
                 courseid: course.id,
                 userid: userid 
             });
             
             if (gradeData.usergrades && gradeData.usergrades[0]) {
                 const gradeItems = gradeData.usergrades[0].gradeitems || [];
                 log(`Moodle Sync: Found ${gradeItems.length} grade items for ${course.shortname}`);
                 
                 // Pass 1: Extract Category Names from category totals
                 const categoryMap = new Map<number, string>();
                 for (const item of gradeItems) {
                     // Moodle returns itemtype='category' for category totals. 
                     // iteminstance usually matches the category ID used by children items (in item.categoryid)
                     if (item.itemtype === 'category' && item.iteminstance) {
                         const name = item.itemname ? item.itemname.replace(/ total$/i, '').trim() : '';
                         if (name && name !== 'Course') {
                             categoryMap.set(item.iteminstance, name);
                         }
                     }
                 }

                 for (const item of gradeItems) {
                     // Filter out category totals or course totals if desired, or keep them.
                     // Usually itemType='mod' is an assignment/quiz.
                     // IMPORTANT: 'category' items often hold the course total or category total
                     // Forum posts often come as itemtype='mod', but module='forum'
                     // We should accept almost anything with a valid raw grade.
                     // Let's broaden the filter to accept any item with a max grade > 0 and a valid raw score.
                     
                     // Debug logging for specific investigation
                     if ((item.itemname || '').toLowerCase().includes('forum') || (item.itemname || '').toLowerCase().includes('introduction')) {
                         log(`[DEBUG ITEM] ${item.itemname}: type=${item.itemtype}, module=${item.itemmodule}, raw=${item.graderaw}, max=${item.grademax}, formatted=${item.gradeformatted}`);
                     }

                     // Check for "Group Discussion total" or other category totals
                     // Moodle returns item.itemtype = 'category' for these.
                     // The itemname often contains "total".
                     
                     // Skip if it's the "Course total" unless we explicitly want only that.
                     // But user wants details.
                     // Wait, in the screenshot, "300/100" is likely "Group Discussion total" where max is actually 300? 
                     // Or maybe the weights are confusing it.
                     // Ah, 3 posts @ 100 each = 300 total points in the category? 
                     // Moodle output: 300.00 (Grade) / 100.00 % (Percentage?) No.
                     
                     // Let's refine the logic:
                     // 1. Ignore "Category total" items if we are already syncing the individual items.
                     //    (The "300/100" entry is likely a category total that looks weird).
                     //    If itemtype is 'category', we might want to skip it to avoid double counting or confusion,
                     //    unless it's the specific "Course Total".
                     
                     const isCategoryTotal = item.itemtype === 'category';
                     const isCourseTotal = item.itemtype === 'course';
                     
                     if (isCategoryTotal || isCourseTotal) {
                         // Skip category totals and course totals.
                         // Category totals cause double counting (e.g. "Group Discussion total" 300/100).
                         // Course totals (e.g. 10/100) are treated as assignments and tank the grade because the app calculates its own total.
                         log(`Moodle Sync: Skipping total item: ${item.itemname || 'Course Total'} (type=${item.itemtype})`);
                         continue;
                     }

                     if (isCategoryTotal || isCourseTotal) {
                         // Skip category totals and course totals.
                         // Category totals cause double counting (e.g. "Group Discussion total" 300/100).
                         // Course totals (e.g. 10/100) are treated as assignments and tank the grade because the app calculates its own total.
                         log(`Moodle Sync: Skipping total item: ${item.itemname || 'Course Total'} (type=${item.itemtype})`);
                         continue;
                     }

                     // Fix for Moodle 4.x weirdness: sometimes grademax is undefined in the JSON if not set, or 0.
                     // But we have a raw score! 
                     // Also, gradeformatted is "100.00" but grademax is undefined.
                     // If grademax is missing, we can try to infer it from gradeformatted range or default to 100.
                     // Actually, if grademax is undefined/null, but we have a raw score, we should save it.
                     
                     let maxScore = item.grademax;
                     if (!maxScore || maxScore === 0) {
                         // Fallback: mostly Moodle items are out of 100 unless specified.
                         // Or try to parse from rangeformatted if available?
                         // For now, if raw is 100, let's assume max is 100.
                         if (item.graderaw > 0) maxScore = 100; 
                         // Or just default to 100.
                         else maxScore = 100;
                     }
                     
                     // Validate grade existence
                     // We trust graderaw if it exists. gradeformatted is secondary.
                     // Sometimes gradeformatted is '-' for 0 or hidden, but if graderaw is present, we take it.
                     const hasRawGrade = item.graderaw !== null && item.graderaw !== undefined;
                     const isNotPlaceholder = item.gradeformatted !== '-';

                     if (hasRawGrade && isNotPlaceholder) {
                         // Parse grade.
                         const rawScore = parseFloat(item.graderaw);
                         if (!isNaN(rawScore)) {
                             const itemName = item.itemtype === 'course' ? 'Course Total' : item.itemname;
                             const categoryHint = item.categoryid ? categoryMap.get(item.categoryid) : undefined;
                             
                             log(`Moodle Sync: Saving grade for ${itemName} (${rawScore}/${maxScore}) [Cat: ${categoryHint || 'None'}]`);

                             await updateCourseGrades(databases, DATABASE_ID, COURSES_COLLECTION, internalCourseId, itemName, {
                                 score: rawScore,
                                 total: maxScore
                             }, categoryHint);
                             gradesUpdatedCount++;
                         } else {
                            log(`Moodle Sync: Failed to parse raw score for ${item.itemname} (raw=${item.graderaw})`);
                         }
                     } else if ((item.itemname || '').toLowerCase().includes('technial')) { 
                         // Debug logging specifically for the missing item if it fails the check
                         log(`Moodle Sync: [DEBUG FAIL] Skipping "Technial" item. hasRaw=${hasRawGrade}, fmt=${item.gradeformatted}, raw=${item.graderaw}`);
                     }
                 }
             } else {
                 log(`Moodle Sync: No user grades found for course ${course.shortname}`);
             }
        }
    } catch (e) {
        console.error("Moodle Grade Sync Failed", e);
        log(`Moodle Grade Sync Failed: ${e}`);
    }


    // 2. Fetch Assignments
    // Note: older moodles might not return 'assignments' directly if no courses passed?
    // Usually fetching for all enrolled courses works if we don't pass courseids (or pass all)
    // Actually documentation says "Returns the courses and assignments for the users capability"
    // Using empty courseids usually returns all? Let's try passing nothing.
    // If that fails, we extract ids.
    
    // Actually, mod_assign_get_assignments usually accepts courseids parameter.
    // Let's pass all course IDs just to be safe.
    // BUT param encoding for arrays in form-data/URL params for Moodle can be tricky (e.g. courseids[0]=1...)
    // Let's try calling it without courseids first (if supported), or manually building the array params.
    
    // We'll manual build params for courseids
    const assignParams: any = {}
    courses.forEach((c: any, index: number) => {
        assignParams[`courseids[${index}]`] = c.id
    })
    
    // Wait, let's just use `mod_assign_get_assignments` safely.
    // Does it auto-fetch if no courseids? 
    // "If empty: returns all courses with assignments for the user." -> Perfect.
    
    console.log(`Moodle Sync: Fetching assignments...`)
    const assignData = await moodleCall('mod_assign_get_assignments')
    
    if (assignData.exception) {
         return NextResponse.json({ success: false, error: `Moodle Error: ${assignData.message}` }, { status: 400 })
    }
    
    // assignData structure: { courses: [ { id, fullname, shortname, assignments: [ ... ] } ], warnings: [] }
    const moodleCoursesWithAssigns = assignData.courses || [];
    
    // Flatten assignments
    let allMoodleAssignments: any[] = [];
    
    moodleCoursesWithAssigns.forEach((c: any) => {
        const courseName = c.fullname;
        const courseShortName = c.shortname;
        const courseId = c.id;
        
        if (c.assignments) {
            c.assignments.forEach((a: any) => {
                allMoodleAssignments.push({
                    id: a.id,
                    cmid: a.cmid, // Course Module ID (needed for link)
                    title: a.name,
                    dueDate: a.duedate, // Timestamp in seconds
                    courseId: courseId,
                    courseName: courseName,
                    courseShortName: courseShortName,
                    // intro: a.intro -- description
                })
            })
        }
    })

    console.log(`Moodle Sync: Found ${allMoodleAssignments.length} total assignments`)

    // 4. Sync Assignments with Appwrite
    // (We already have databases client and internalCourses from step 3)

    const startSync = new Date();
    const todayMidnight = new Date(startSync.getFullYear(), startSync.getMonth(), startSync.getDate()).getTime() / 1000; // Seconds

    // Fetch existing Moodle assignments
    const existingDocs = await databases.listDocuments(
        DATABASE_ID,
        ASSIGNMENTS_COLLECTION,
        [
            Query.equal('userId', user.$id),
            Query.equal('source', 'moodle'),
            Query.limit(100)
        ]
    );

    let createdCount = 0;
    let updatedCount = 0;

    for (const mAssign of allMoodleAssignments) {
        const mId = mAssign.id.toString();
        const cId = mAssign.cmid.toString();
        // Check for existing assignment by either ID (old style) or CMID (new style)
        const existing = existingDocs.documents.find((d: any) =>
            d.gradescopeId === mId || d.gradescopeId === cId
        );

        const dueDateObj = mAssign.dueDate ? new Date(mAssign.dueDate * 1000) : null;

        // Link Course
        let internalCourseId = '';
        const mCodeClean = normalize(mAssign.courseShortName);
        const mNameClean = normalize(mAssign.courseName);

        for (const internal of internalCourses) {
            const iCode = normalize(internal.code);
            const iName = normalize(internal.name);
            if (mCodeClean.includes(iCode) || iCode.includes(mCodeClean) || mNameClean === iName) {
                internalCourseId = internal.$id;
                break;
            }
        }

        // Check submission status for this assignment
        let isSubmitted = false;
        try {
            const submissionData = await moodleCall('mod_assign_get_submission_status', {
                assignid: mAssign.id,
                userid: userid
            });

            // Check if assignment has been submitted
            // Moodle API returns lastattempt.submission.status which can be "submitted" or other values
            if (submissionData?.lastattempt?.submission?.status === 'submitted' ||
                submissionData?.lastattempt?.graded === true) {
                isSubmitted = true;
            }
        } catch (e) {
            // If API call fails, continue without submission status (default to not submitted)
            console.log(`Moodle Sync: Could not fetch submission status for assignment ${mAssign.id}`)
        }

        // Filtering Logic
        // 1. If existing, keep/update
        // 2. If New, must be due today+ and not submitted

        if (!existing) {
            // Check Date (dueDate is seconds)
            if (mAssign.dueDate < todayMidnight) {
                continue; // Past due
            }

            // Skip if already submitted
            if (isSubmitted) {
                continue;
            }
        }

        const docData = {
            title: mAssign.title,
            deadline: dueDateObj ? dueDateObj.toISOString() : null,
            gradescopeId: mAssign.cmid.toString(), // Store CMID (Course Module ID) for link generation
            gradescopeCourseId: mAssign.courseId.toString(),
            gradescopeCourseName: url, // Store BASE Moodle URL for link generation
            courseId: existing ? existing.courseId : internalCourseId,
            source: 'moodle',
            status: isSubmitted ? 'completed' : 'not_started'
        };

        if (existing) {
             const existingDeadline = existing.deadline ? new Date(existing.deadline).getTime() : 0;
             const newDeadline = docData.deadline ? new Date(docData.deadline).getTime() : 0;
             const titleChanged = existing.title !== docData.title;
             const deadlineChanged = existingDeadline !== newDeadline;
             const courseIdChanged = !existing.courseId && internalCourseId;
             const cmidChanged = existing.gradescopeId !== docData.gradescopeId; // If we didn't store CMID before
             const statusChanged = docData.status === 'completed' && existing.status !== 'completed';

             if (titleChanged || deadlineChanged || courseIdChanged || cmidChanged || statusChanged) {
                 const updates: any = {
                     title: docData.title,
                     deadline: docData.deadline,
                     gradescopeId: docData.gradescopeId, // Update detailed ID
                     gradescopeCourseName: docData.gradescopeCourseName // Ensure URL is saved
                 }
                 if (courseIdChanged) updates.courseId = internalCourseId;

                 // If we detected it's submitted, mark as completed
                 if (statusChanged) {
                     updates.status = 'completed';
                     updates.completedAt = new Date().toISOString();
                 }

                 await databases.updateDocument(
                    DATABASE_ID,
                    ASSIGNMENTS_COLLECTION,
                    existing.$id,
                    updates
                 );
                 updatedCount++;
             }
        } else {
            // Create
            await databases.createDocument(
                DATABASE_ID,
                ASSIGNMENTS_COLLECTION,
                ID.unique(),
                {
                    ...docData,
                    category: 'assignment',
                    userId: user.$id,
                    tags: [],
                    completedAt: docData.status === 'completed' ? new Date().toISOString() : null,
                    notes: `Imported from Moodle (${mAssign.courseShortName})`
                }
            );
            createdCount++;
        }
    }

    log(`Moodle Sync: Found ${allMoodleAssignments.length} total assignments`)

    return NextResponse.json({ 
        success: true, 
        created: createdCount, 
        updated: updatedCount, 
        count: allMoodleAssignments.length,
        debug: logs 
    })

  } catch (error) {
    console.error('Moodle Sync Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error during sync' }, { status: 500 })
  }
}
