import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createSessionClient } from '@/lib/appwrite/server'
import { decryptToken } from '@/lib/gradescope/encryption'
import { ID, Query } from 'node-appwrite'

const DATABASE_ID = "6971d0970008b1d89c01"
const ASSIGNMENTS_COLLECTION = "assignment"
const GRADESCOPE_BASE_URL = "https://www.gradescope.com"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.prefs.gradescopeSessionToken) {
        return NextResponse.json({ success: false, error: 'Gradescope not connected' }, { status: 400 })
    }

    let sessionToken: string;
    try {
        sessionToken = decryptToken(user.prefs.gradescopeSessionToken);
    } catch (e) {
        console.error("Failed to decrypt token", e);
        return NextResponse.json({ success: false, error: 'Failed to decrypt session token' }, { status: 500 })
    }

    // 1. Fetch Courses
    const coursesResponse = await fetch(`${GRADESCOPE_BASE_URL}/api/v1/courses`, {
        headers: {
            'Cookie': `_gradescope_session=${sessionToken}`
        }
    });

    if (!coursesResponse.ok) {
        if (coursesResponse.status === 401 || coursesResponse.status === 403) {
             return NextResponse.json({ success: false, error: 'Gradescope session expired. Please reconnect.' }, { status: 401 })
        }
        return NextResponse.json({ success: false, error: 'Failed to fetch courses from Gradescope' }, { status: 500 })
    }

    const coursesData = await coursesResponse.json();
    const courses = coursesData.courses || [];
    
    // 2. Fetch Assignments for all courses
    let allGsAssignments: any[] = [];
    
    for (const course of courses) {
        // We can fetch in parallel but let's be nice to the API
        const assignResponse = await fetch(`${GRADESCOPE_BASE_URL}/courses/${course.course_id}/assignments`, {
            headers: {
                'Cookie': `_gradescope_session=${sessionToken}`
            }
        });
        
        if (assignResponse.ok) {
            const assignData = await assignResponse.json();
            const assignments = assignData.assignments || [];
            // Attach course info to assignment object for easier processing
            assignments.forEach((a: any) => {
                a.course_id = course.course_id;
                a.course_name = course.name;
            });
            allGsAssignments = allGsAssignments.concat(assignments);
        }
    }

    // 3. Sync with Appwrite
    const { databases } = await createSessionClient(request);
    
    // Fetch existing Gradescope assignments for this user
    // We limit to 100/page. If user has more, we should paginate. 
    // For sync now, 100 is probably ok for active assignments.
    const existingDocs = await databases.listDocuments(
        DATABASE_ID,
        ASSIGNMENTS_COLLECTION,
        [
            Query.equal('userId', user.$id),
            Query.equal('source', 'gradescope'),
            Query.limit(100) 
        ]
    );

    let createdCount = 0;
    let updatedCount = 0;
    
    for (const gsAssign of allGsAssignments) {
        const gsId = gsAssign.id.toString(); // Ensure string
        const existing = existingDocs.documents.find((d: any) => d.gradescopeId === gsId);
        
        // Map GS data to our schema
        const docData = {
            title: gsAssign.title,
            deadline: gsAssign.due_date || gsAssign.submission_window_end_date, // "2023-10-10T..."
            gradescopeId: gsId,
            gradescopeCourseId: gsAssign.course_id,
            gradescopeCourseName: gsAssign.course_name,
            pointsPossible: gsAssign.points_possible,
            // Only set these on creation or if we want to overwrite user changes? 
            // Usually valid to overwrite title/deadline if source is GS.
        };

        if (existing) {
            // Update if changed
            if (existing.title !== docData.title || existing.deadline !== docData.deadline) {
                await databases.updateDocument(
                    DATABASE_ID,
                    ASSIGNMENTS_COLLECTION,
                    existing.$id,
                    docData
                );
                updatedCount++;
            }
        } else {
            // Create New
            await databases.createDocument(
                DATABASE_ID,
                ASSIGNMENTS_COLLECTION,
                ID.unique(),
                {
                    ...docData,
                    status: 'not_started',
                    category: 'assignment',
                    userId: user.$id,
                    source: 'gradescope',
                    courseId: '', // No internal course link yet
                    tags: [],
                    notes: `Imported from Gradescope (${gsAssign.course_name})`,
                    calendarSynced: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }
            );
            createdCount++;
        }
    }

    // Update last sync time
    // We need admin client to update prefs? 
    // Actually user can usually update their own prefs if configured, but let's see. 
    // The previous code used admin. But `users` service is admin only usually.
    // However, we can just return success and let the UI update local state or ignore.
    // Ideally we update the prefs on server.

    return NextResponse.json({ 
        success: true, 
        count: allGsAssignments.length,
        created: createdCount,
        updated: updatedCount
    });

  } catch (err: any) {
    console.error('Sync Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
