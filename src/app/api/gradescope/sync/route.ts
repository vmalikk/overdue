import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createSessionClient } from '@/lib/appwrite/server'
import { decryptToken } from '@/lib/gradescope/encryption'
import { ID, Query } from 'node-appwrite'
import * as cheerio from 'cheerio'

const DATABASE_ID = "6971d0970008b1d89c01"
const ASSIGNMENTS_COLLECTION = "assignment"
const GRADESCOPE_BASE_URL = "https://www.gradescope.com"

// Helper to parse Gradescope dates like "OCT 25 AT 11:59PM"
function parseGradescopeDate(dateStr: string): Date | null {
    try {
        if (!dateStr) return null;
        // Clean string: remove "Late Due Date:", strip whitespace
        let clean = dateStr.replace(/Late Due Date:/i, '').trim();
        // Remove "AT" to make it "OCT 25 11:59PM"
        clean = clean.replace(/\s+AT\s+/i, ' ');
        
        // Append current year since Gradescope omits it
        // We'll simplisticly use current year. 
        // Improvement: if month is > current month + 6, maybe last year? 
        // For now, assume current year or next year if month passed? 
        // Actually, just try current year.
        const currentYear = new Date().getFullYear();
        const date = new Date(`${clean} ${currentYear}`);
        
        if (isNaN(date.getTime())) return null;
        return date;
    } catch (e) {
        return null;
    }
}

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

    const headers = {
        'Cookie': `_gradescope_session=${sessionToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // 1. Fetch Account (Dashboard) to Scrape Courses
    // The API /api/v1/courses does not seem to reliably work for students
    console.log('Gradescope Sync: Fetching account page...');
    const accountRes = await fetch(`${GRADESCOPE_BASE_URL}/account`, { headers });

    if (!accountRes.ok) {
        if (accountRes.status === 401 || accountRes.status === 403 || accountRes.url.includes('/login')) {
             return NextResponse.json({ success: false, error: 'Gradescope session expired. Please reconnect.' }, { status: 401 })
        }
        console.error(`Gradescope Sync: Failed to fetch account page. Status: ${accountRes.status}`);
        return NextResponse.json({ success: false, error: 'Failed to fetch dashboard from Gradescope' }, { status: 500 })
    }

    const accountHtml = await accountRes.text();
    const $ = cheerio.load(accountHtml);
    
    interface GSCourse {
        id: string;
        name: string;
        shortName: string;
    }
    
    const courses: GSCourse[] = [];
    
    // Scrape courses
    // Look for links /courses/123 inside the course list
    $('.courseList--term a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/courses/')) {
            const id = href.split('/')[2];
            const shortName = $(el).find('.courseBox--shortname').text().trim();
            const name = $(el).find('.courseBox--name').text().trim();
            
            if (id) {
                courses.push({ id, name, shortName });
            }
        }
    });

    console.log(`Gradescope Sync: Found ${courses.length} courses`);
    
    // 2. Fetch Assignments for all courses
    let allGsAssignments: any[] = [];
    
    // Limit concurrency to avoid getting blocked
    // For now, sequential is safer
    for (const course of courses) {
        console.log(`Gradescope Sync: Fetching course ${course.id} (${course.shortName})`);
        const courseRes = await fetch(`${GRADESCOPE_BASE_URL}/courses/${course.id}`, { headers });
        
        if (courseRes.ok) {
            const courseHtml = await courseRes.text();
            const $c = cheerio.load(courseHtml);
            
            // Parse Student Table
            const table = $c('#assignments-student-table');
            if (table.length > 0) {
                 table.find('tbody tr').each((_, tr) => {
                     const cells = $c(tr).find('td');
                     if (cells.length === 0) return;
                     
                     // Col 0: Name (contains link)
                     const nameCell = $(cells[0]);
                     const title = nameCell.text().trim();
                     const linkHref = nameCell.find('a').attr('href');
                     const assignmentId = linkHref ? linkHref.split('/').pop() : null;
                     
                     if (!assignmentId) return; // Skip if no ID

                     // Col 2: Status
                     const status = $(cells[2]).text().trim();
                     
                     // Col 4: Due Date
                     let dueDateStr = '';
                     if (cells.length >= 5) {
                         dueDateStr = $(cells[4]).text().trim(); // "OCT 25 AT 11:59PM"
                     }
                     
                     const dueDate = parseGradescopeDate(dueDateStr);
                     
                     // Only add if we have a due date, usually
                     if (dueDate) {
                         allGsAssignments.push({
                             id: assignmentId,
                             title: title,
                             course_id: course.id,
                             course_name: course.shortName || course.name,
                             due_date: dueDate,
                             status: status
                         });
                     }
                 });
            }
        } else {
             console.error(`Failed to fetch course ${course.id}: ${courseRes.status}`);
        }
    }

    console.log(`Gradescope Sync: Found ${allGsAssignments.length} assignments total`);

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
            deadline: gsAssign.due_date.toISOString(), 
            gradescopeId: gsId,
            gradescopeCourseId: gsAssign.course_id,
            gradescopeCourseName: gsAssign.course_name,
            // pointsPossible: gsAssign.points_possible, // Not easily available in student table view
            status: gsAssign.status === 'Submitted' ? 'completed' : 'not_started' // Basic mapping
        };

        if (existing) {
            // Update if changed
            // Only update if deadline changed? Or if status changed?
            // Let's update title/deadline/status
            const existingDeadline = new Date(existing.deadline).getTime();
            const newDeadline = new Date(docData.deadline).getTime();
            
            if (existing.title !== docData.title || existingDeadline !== newDeadline || (docData.status === 'completed' && existing.status !== 'completed')) {
                const updatePayload: any = {
                    title: docData.title,
                    deadline: docData.deadline
                };
                
                // If we detected it's submitted, mark as completed
                if (docData.status === 'completed' && existing.status !== 'completed') {
                    updatePayload.status = 'completed';
                    updatePayload.completedAt = new Date().toISOString();
                }

                await databases.updateDocument(
                    DATABASE_ID,
                    ASSIGNMENTS_COLLECTION,
                    existing.$id,
                    updatePayload
                );
                updatedCount++;
            }
        } else {
            // Create New
            // If it's already past due and not submitted, maybe ignore?
            // Or import as overdue.
            
            await databases.createDocument(
                DATABASE_ID,
                ASSIGNMENTS_COLLECTION,
                ID.unique(),
                {
                    ...docData,
                    status: docData.status === 'completed' ? 'completed' : 'not_started',
                    category: 'assignment',
                    userId: user.$id,
                    source: 'gradescope',
                    courseId: '', // No internal course link yet
                    tags: [],
                    notes: `Imported from Gradescope (${gsAssign.course_name})`,
                    calendarSynced: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    completedAt: docData.status === 'completed' ? new Date().toISOString() : null
                }
            );
            createdCount++;
        }
    }


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
