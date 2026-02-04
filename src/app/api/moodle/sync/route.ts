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

    // 2. Fetch Assignments
    // mod_assign_get_assignments
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

    // 3. Sync with Appwrite
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
        const existing = existingDocs.documents.find((d: any) => d.gradescopeId === mId); // We reuse gradescopeId field for generic 'externalId'
        // Ideally rename `gradescopeId` to `externalId` in schema, but for now reuse.

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

        // Filtering Logic
        // 1. If existing, keep/update
        // 2. If New, must be due today+ and pending
        
        // Moodle doesn't easily give "status" (submitted/graded) in the assignment list itself
        // unless we call `mod_assign_get_submission_status` for EACH assignment. 
        // That is expensive (N API calls). 
        // Optimization: For "Sync Now", maybe we assume if due date passed it's effectively "not for todo list" unless we are keeping history.
        
        // Actually, `mod_assign_get_assignments` usually returns simple info.
        // We will stick to the date filter for new assignments.
        
        if (!existing) {
            // Check Date (dueDate is seconds)
            if (mAssign.dueDate < todayMidnight) {
                continue; // Past due
            }
        }

        const docData = {
            title: mAssign.title,
            deadline: dueDateObj ? dueDateObj.toISOString() : null,
            gradescopeId: mId, // Storing moodle ID here
            gradescopeCourseId: mAssign.courseId.toString(),
            gradescopeCourseName: mAssign.courseName, // or Shortname
            courseId: existing ? existing.courseId : internalCourseId,
            source: 'moodle',
            status: 'not_started' 
        };

        if (existing) {
             const existingDeadline = existing.deadline ? new Date(existing.deadline).getTime() : 0;
             const newDeadline = docData.deadline ? new Date(docData.deadline).getTime() : 0;
             const titleChanged = existing.title !== docData.title;
             const deadlineChanged = existingDeadline !== newDeadline;
             const courseIdChanged = !existing.courseId && internalCourseId;

             if (titleChanged || deadlineChanged || courseIdChanged) {
                 const updates: any = {
                     title: docData.title,
                     deadline: docData.deadline
                 }
                 if (courseIdChanged) updates.courseId = internalCourseId;

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
                    completedAt: null,
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
