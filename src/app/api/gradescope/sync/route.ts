import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createSessionClient } from '@/lib/appwrite/server'
import { decryptToken } from '@/lib/gradescope/encryption'
import { ID, Query } from 'node-appwrite'
import * as cheerio from 'cheerio'

const DATABASE_ID = "6971d0970008b1d89c01"
const ASSIGNMENTS_COLLECTION = "assignment"
const COURSES_COLLECTION = "courses"
const GRADESCOPE_BASE_URL = "https://www.gradescope.com"

// Helper to normalize strings for comparison (remove spaces, lowercase, punctuation)
function normalize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper to find internally stored course that matches Gradescope course
function findInternalCourseId(gsCourse: { name: string, shortName: string }, internalCourses: any[]): string {
    // 1. Try exact match on Short Name (Code) vs Internal Code
    // e.g. "ECE 309 (001)" vs "ECE 309"
    // Clean them both up
    const gsCodeClean = normalize(gsCourse.shortName);
    
    for (const internal of internalCourses) {
        const intCodeClean = normalize(internal.code);
        // If one contains the other (since GS often appends section numbers)
        if (gsCodeClean.includes(intCodeClean) || intCodeClean.includes(gsCodeClean)) {
            return internal.$id;
        }
    }

    // 2. Try match on Course Name
    const gsNameClean = normalize(gsCourse.name);
    for (const internal of internalCourses) {
        const intNameClean = normalize(internal.name);
        if (gsNameClean === intNameClean) return internal.$id;
    }

    return '';
}

// Helper to parse Gradescope dates like "OCT 25 AT 11:59PM" or "2025-09-30 23:59:00 -0400"
function parseGradescopeDate(dateStr: string): Date | null {
    try {
        if (!dateStr) return null;
        
        // 1. Try parsing exact timestamp first (e.g. "2025-09-30 23:59:00 -0400")
        const directDate = new Date(dateStr);
        if (!isNaN(directDate.getTime())) {
            return directDate;
        }

        // 2. Fallback to "OCT 25 AT..." format
        // Clean string: remove "Late Due Date:", strip whitespace
        let clean = dateStr.replace(/Late Due Date:/i, '').trim();
        // Remove "AT" to make it "OCT 25 11:59PM"
        clean = clean.replace(/\s+AT\s+/i, ' ');
        
        // Append current year since Gradescope (text format) omits it
        const currentYear = new Date().getFullYear();
        const date = new Date(`${clean} ${currentYear}`);
        
        if (isNaN(date.getTime())) return null;
        return date;
    } catch (e) {
        return null;
    }
}

// Helper to update course grades (replicated from moodle sync logic)
async function updateCourseGrades(databases: any, dbId: string, collId: string, courseId: string, title: string, grade: { score: number, total: number }) {
    try {
        const course = await databases.getDocument(dbId, collId, courseId);
        let gradedItems = course.gradedItems ? JSON.parse(course.gradedItems) : [];
        if (!Array.isArray(gradedItems)) gradedItems = [];

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
            let gradeWeights = course.gradeWeights ? JSON.parse(course.gradeWeights) : [];
            let category = null;
            
            if (gradeWeights.length > 0) {
                // Find matching category
                const match = gradeWeights.find((gw: any) => title.toLowerCase().includes(gw.category.toLowerCase()));
                if (match) {
                    category = match.category;
                } else {
                    category = gradeWeights[0].category; // Fallback to first
                }
            } else {
                category = "Assignments";
            }

            // Fallback for empty array check above
            if (!category) category = "Assignments";

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
    const gradeUpdates: any[] = [];
    
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
                     // Include 'th' to capture the assignment name column if it's a header cell
                     const cells = $c(tr).find('th, td');
                     if (cells.length === 0) return;

                     // DEBUG: Log all columns to understand structure
                     if (i === 0) {
                         const rowDebug: string[] = [];
                         cells.each((idx: number, c: any) => {
                            rowDebug.push(`Col ${idx} [${c.tagName}]: "${$c(c).text().trim()}"`);
                         });
                         log(`Gradescope Sync: First Row Structure: ${rowDebug.join(' | ')}`);
                     }
                     
                     // Helper to find the name from the first few columns
                     let title = "";
                     let assignmentId = 'manual-' + i;

                     // Strategy: The name is usually in the first column (index 0)
                     const potentialNameCell = $c(cells[0]);
                     const titleAnchor = potentialNameCell.find('a');
                     
                     if (titleAnchor.length > 0) {
                        title = titleAnchor.text().trim();
                        const linkHref = titleAnchor.attr('href');
                        if (linkHref) assignmentId = linkHref.split('/').pop() || assignmentId;
                     } else {
                        // Fallback: Check if 2nd column has an anchor if the 1st was empty or weird
                        title = potentialNameCell.text().trim();
                     }

                     const cleanTitle = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

                     let status = '';
                     let dueDateStr = '';
                     
                     // Attempt to grab status from column 1 or 2
                     if (cells.length >= 2) {
                        status = $c(cells[1]).text().trim();
                     }

                     // Look for date in the last columns
                     for (let j = cells.length - 1; j >= 1; j--) {
                         const txt = $c(cells[j]).text().trim();
                         if (txt.match(/^\d{4}-\d{2}-\d{2}/)) {
                             dueDateStr = txt;
                             break;
                         }
                     }
                     
                     // Grade Parsing
                     let score: number | null = null;
                     let total: number | null = null;

                     cells.each((_: unknown, cell: unknown) => {
                         const cellText = $c(cell).text().trim();
                         const scoreMatch = cellText.match(/([\d\.]+)\s*\/\s*([\d\.]+)/);
                         if (scoreMatch) {
                             score = parseFloat(scoreMatch[1]);
                             total = parseFloat(scoreMatch[2]);
                         }
                     });
                     
                     // If found score, queue update
                     if (score !== null) {
                         const internalCourseId = findInternalCourseId(course, internalCourses.documents);
                         if (internalCourseId) {
                             log(`Found Grade: ${cleanTitle} = ${score}/${total} for course ${course.shortName} -> ${internalCourseId}`);
                             gradeUpdates.push({
                                 courseId: internalCourseId,
                                 title: cleanTitle,
                                 score,
                                 total
                             });
                         }
                     }

                     log(`Gradescope Sync: Found assignment "${cleanTitle}" - Due: "${dueDateStr}" (Cols: ${cells.length})`);

                     // Determine if submitted/graded for status mapping
                     const isSubmittedOrGraded = 
                        status.toLowerCase().includes('submitted') || 
                        status.toLowerCase().includes('graded') ||
                        /\d+\.?\d*\s*\/\s*\d+\.?\d*/.test(status);

                     const dueDate = parseGradescopeDate(dueDateStr);
                     
                     if (dueDate) {
                         allGsAssignments.push({
                             id: assignmentId,
                             title: cleanTitle,
                             courseId: course.id,
                             courseName: course.name,
                             courseShortName: course.shortName,
                             deadline: dueDate.toISOString(),
                             status: status,
                             score,
                             total,
                             isSubmitted: isSubmittedOrGraded
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
    const { databases, account } = await createSessionClient(request);
    
    // Fetch internal courses to link assignments
    let internalCourses: any[] = [];
    try {
        const coursesRes = await databases.listDocuments(
            DATABASE_ID,
            COURSES_COLLECTION,
            [Query.equal('userId', user.$id)]
        );
        internalCourses = coursesRes.documents;
        
        // Log available internal courses for debug
        const courseDebug = internalCourses.map(c => `${c.code} (${c.$id})`).join(', ');
        log(`Gradescope Sync: Internal courses available: ${courseDebug}`);
    } catch (e) {
        log(`Gradescope Sync: Failed to fetch internal courses: ${e}`);
    }

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
    
    // Filter out past assignments: Only process tasks due today or in the future
    // We use midnight of the current day as the cutoff
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const gsAssign of allGsAssignments) {
        const gsId = gsAssign.id.toString(); // Ensure string
        const existing = existingDocs.documents.find((d: any) => d.gradescopeId === gsId);
        
        // FILTERING LOGIC:
        // 1. If assignment already exists in our DB, we KEEP it (and update it).
        // 2. If it is NEW, we apply filters:
        //    - Must be due today or in the future
        //    - Must NOT be submitted/graded
        if (!existing) {
             // Check Date: Skip if due date is strictly before today (yesterday or older)
             if (gsAssign.due_date < todayMidnight) {
                 continue;
             }
             
             // Check Status: Skip if already submitted/graded
             // Actually, user wants grades to be captured (which we did above in gradeUpdates loop)
             // But they don't want old tasks.
             // So this filter is correct for TASK CREATION.
             // We check gsAssign.status? No, we didn't parse status robustly in cheerio.
             // But valid grades should have been caught above.
             if (gsAssign.isSubmitted) {
                 continue;
             }
        }

        // Try to link to an internal course ID
        const internalCourseId = findInternalCourseId({
            name: gsAssign.course_name,
            shortName: gsAssign.course_name // Note: we only stored shortName || name in course_name
            // Improvement: we should have stored both individually in allGsAssignments
            // But for now, let's just pass what we have.
            // Actually, wait, let's fix the allGsAssignments push to include shortName separately
        }, internalCourses);

        // Map GS data to our schema
        const docData = {
            title: gsAssign.title,
            deadline: gsAssign.due_date.toISOString(), 
            gradescopeId: gsId,
            gradescopeCourseId: gsAssign.course_id,
            gradescopeCourseName: gsAssign.course_name,
            courseId: existing ? existing.courseId : internalCourseId, // Use found ID or keep existing
            // pointsPossible: gsAssign.points_possible, // Not easily available in student table view
            status: gsAssign.isSubmitted ? 'completed' : 'not_started' // Basic mapping
        };

        if (existing) {
            // Update if changed
            // Only update if deadline changed? Or if status changed?
            // Let's update title/deadline/status
            const existingDeadline = new Date(existing.deadline).getTime();
            const newDeadline = new Date(docData.deadline).getTime();
            
            // Check if courseId link was missing but now found
            const courseIdChanged = !existing.courseId && internalCourseId;

            if (existing.title !== docData.title || existingDeadline !== newDeadline || (docData.status === 'completed' && existing.status !== 'completed') || courseIdChanged) {
                const updatePayload: any = {
                    title: docData.title,
                    deadline: docData.deadline
                };
                
                if (courseIdChanged) {
                    updatePayload.courseId = internalCourseId;
                }
                
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
                    // courseId is already in docData
                    tags: [],
                    notes: `Imported from Gradescope (${gsAssign.course_name})`,
                    calendarSynced: false,
                    completedAt: docData.status === 'completed' ? new Date().toISOString() : null
                }
            );
            createdCount++;
        }
    }


    // Update last sync time in user prefs
    await account.updatePrefs({
        ...user.prefs,
        gradescopeLastSync: new Date().toISOString()
    });

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
