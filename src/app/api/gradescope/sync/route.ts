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
    let cookieHeader = '';

    try {
        const decrypted = decryptToken(user.prefs.gradescopeSessionToken);
        
        // Try to parse as JSON (new format)
        try {
            const cookies = JSON.parse(decrypted);
            // Construct header from object
            cookieHeader = Object.entries(cookies)
                .map(([k, v]) => `${k}=${v}`)
                .join('; ');
            sessionToken = cookies['_gradescope_session']; // For logging/fallback
        } catch (e) {
            // Fallback for logic where we stored just the string
            cookieHeader = `_gradescope_session=${decrypted}`;
            sessionToken = decrypted;
        }
    } catch (e) {
        console.error("Failed to decrypt token", e);
        return NextResponse.json({ success: false, error: 'Failed to decrypt session token' }, { status: 500 })
    }

    const headers = {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
    };

    // 1. Fetch Account (Dashboard) to Scrape Courses
    // The API /api/v1/courses does not seem to reliably work for students
    log('Gradescope Sync: Fetching account page...');
    // log('Gradescope Sync: Using Cookies:', cookieHeader); 
    
    const accountRes = await fetch(`${GRADESCOPE_BASE_URL}/account`, { 
        headers: headers,
        redirect: 'follow' 
    });

    if (!accountRes.ok) {
        if (accountRes.status === 401 || accountRes.status === 403) {
             return NextResponse.json({ success: false, error: 'Gradescope session expired. Please reconnect.', debug: logs }, { status: 401 })
        }
        log(`Gradescope Sync: Failed to fetch account page. Status: ${accountRes.status}`);
        return NextResponse.json({ success: false, error: 'Failed to access Gradescope dashboard', debug: logs }, { status: 500 })
    }
    
    // Check if we were redirected to login
    if (accountRes.url.includes('/login')) {
         log('Gradescope Sync: Redirected to login page. Session likely invalid.');
         return NextResponse.json({ success: false, error: 'Session invalid. Please reconnect.', debug: logs }, { status: 401 });
    }

    const accountHtml = await accountRes.text();
    const $ = cheerio.load(accountHtml);
    
    // Debug: Log the page title or login check
    const pageTitle = $('title').text();
    log(`Gradescope Sync: Page Title: ${pageTitle}`);

    // If title suggests login
    if (pageTitle.includes("Log In")) {
         return NextResponse.json({ success: false, error: 'Session invalid (Login Page detected). Please reconnect.', debug: logs }, { status: 401 });
    }
    
    interface GSCourse {
        id: string;
        name: string;
        shortName: string;
    }
    
    const courses: GSCourse[] = [];
    
    // Scrape courses
    // Strategy: Look for all course box shortnames, then find the parent anchor
    $('.courseBox--shortname').each((_, el) => {
        const shortName = $(el).text().trim();
        const parentAnchor = $(el).closest('a');
        const href = parentAnchor.attr('href');
        const name = parentAnchor.find('.courseBox--name').text().trim();
        
        if (href && href.startsWith('/courses/')) {
            const id = href.split('/')[2];
            log(`Gradescope Sync: Found course ${shortName} (ID: ${id})`);
            courses.push({ id, name, shortName });
        }
    });

    log(`Gradescope Sync: Found ${courses.length} courses`);
    
    // 2. Fetch Assignments for all courses
    let allGsAssignments: any[] = [];
    
    // Limit concurrency to avoid getting blocked
    // For now, sequential is safer
    for (const course of courses) {
        log(`Gradescope Sync: Fetching course ${course.id} (${course.shortName})`);
        const courseRes = await fetch(`${GRADESCOPE_BASE_URL}/courses/${course.id}`, { headers });
        
        if (courseRes.ok) {
            const courseHtml = await courseRes.text();
            const $c = cheerio.load(courseHtml);
            
            // Parse Student Table
            const table = $c('#assignments-student-table');
            log(`Gradescope Sync: Course ${course.id} - Table found: ${table.length > 0}`);
            
            if (table.length > 0) {
                 table.find('tbody tr').each((i, tr) => {
                     const cells = $c(tr).find('td');
                     if (cells.length === 0) return;
                     
                     // Col 0: Name (contains link)
                     const nameCell = $c(cells[0]);
                     const title = nameCell.text().trim(); // Note: This might include "Submitted" text if not careful? 
                     // Usually nameCell has an anchor.
                     const linkHref = nameCell.find('a').attr('href');
                     const assignmentId = linkHref ? linkHref.split('/').pop() : 'manual-' + i;
                     
                     // Helper to clean title logic if needed
                     const cleanTitle = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

                     // Col 2: Status
                     const status = $c(cells[2]).text().trim();
                     
                     // Col 4: Due Date
                     let dueDateStr = '';
                     if (cells.length >= 5) {
                         dueDateStr = $c(cells[4]).text().trim(); // "OCT 25 AT 11:59PM"
                     }
                     
                     log(`Gradescope Sync: Found assignment "${cleanTitle}" - Due: "${dueDateStr}"`);

                     const dueDate = parseGradescopeDate(dueDateStr);
                     
                     // Only add if we have a due date, usually
                     if (dueDate) {
                         allGsAssignments.push({
                             id: assignmentId,
                             title: cleanTitle,
                             course_id: course.id,
                             course_name: course.shortName || course.name,
                             due_date: dueDate,
                             status: status
                         });
                     } else {
                         log('Gradescope Sync: Skipped due to invalid date parsing');
                     }
                 });
            } else {
                // Should we check for instructor view? Or maybe "No assignments" text?
                const noAssignments = $c('body').text().includes('No assignments');
                log(`Gradescope Sync: No assignment table. "No assignments" text present? ${noAssignments}`);
            }
        } else {
             log(`Failed to fetch course ${course.id}: ${courseRes.status}`);
        }
    }

    log(`Gradescope Sync: Found ${allGsAssignments.length} assignments total`);

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
        updated: updatedCount,
        debug: logs
    });

  } catch (err: any) {
    console.error('Sync Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
}
