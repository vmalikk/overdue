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
async function updateCourseGrades(databases: any, dbId: string, collId: string, courseId: string, title: string, grade: { score: number, total: number }) {
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
            if (gradeWeights && gradeWeights.length > 0) {
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
                     if (c.endsWith('s') && t.includes(c.slice(0, -1))) return true;
                     return false;
                 });
                 if (match) category = match.category;
                 else category = gradeWeights[0].category;
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
    console.log(`Moodle Sync: Fetching courses for user ${userid}...`)
    const coursesData = await moodleCall('core_enrol_get_users_courses', { userid })
    
    if (coursesData.exception) {
        return NextResponse.json({ success: false, error: `Moodle Error: ${coursesData.message}` }, { status: 400 })
    }

    const courses = coursesData as any[]; // Array of courses
    console.log(`Moodle Sync: Found ${courses.length} courses`)

    // 2. Fetch Grades (NEW: Before Assignments)
    // gradereport_user_get_grade_items
    try {
        console.log(`Moodle Sync: Fetching grades...`)
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

             for (const internal of internalCourses) {
                const iCode = normalize(internal.code);
                const iName = normalize(internal.name);
                if (mCodeClean.includes(iCode) || iCode.includes(mCodeClean) || mNameClean === iName) {
                    internalCourseId = internal.$id;
                    break;
                }
             }

             if (!internalCourseId) continue; // Skip unlinked courses

             const gradeData = await moodleCall('gradereport_user_get_grade_items', { 
                 courseid: course.id,
                 userid: userid 
             });
             
             if (gradeData.usergrades && gradeData.usergrades[0]) {
                 const gradeItems = gradeData.usergrades[0].gradeitems;
                 for (const item of gradeItems) {
                     // Filter out category totals or course totals if desired, or keep them.
                     // Usually itemType='mod' is an assignment/quiz.
                     // IMPORTANT: 'category' items often hold the course total or category total
                     if ((item.itemtype === 'mod' || item.itemtype === 'course') && item.gradeformatted && item.gradeformatted !== '-' && item.grademax > 0) {
                         // Parse grade. gradeformatted might be "85.00" or "-"
                         const rawScore = parseFloat(item.graderaw); // graderaw is numeric
                         if (!isNaN(rawScore)) {
                             const itemName = item.itemtype === 'course' ? 'Course Total' : item.itemname;
                             
                             await updateCourseGrades(databases, DATABASE_ID, COURSES_COLLECTION, internalCourseId, itemName, {
                                 score: rawScore,
                                 total: item.grademax
                             });
                             gradesUpdatedCount++;
                         }
                     }
                 }
             } else {
                 console.log(`Moodle Sync: No user grades found for course ${course.shortname}`);
             }
        }
    } catch (e) {
        console.error("Moodle Grade Sync Failed", e);
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

    return NextResponse.json({ 
        success: true, 
        created: createdCount, 
        updated: updatedCount, 
        count: allMoodleAssignments.length 
    })

  } catch (error) {
    console.error('Moodle Sync Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error during sync' }, { status: 500 })
  }
}
