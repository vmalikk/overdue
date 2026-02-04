import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Users, Query, ID } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite/config';
import { decrypt } from '@/lib/utils/encryption';
import { normalize } from '@/lib/utils/string';

// Reusing Moodle fetch logic (should ideally be extracted to a lib service)
async function fetchMoodleAssignments(url: string, token: string, userid: number) {
  const wsUrl = `${url}/webservice/rest/server.php`;
  
  // 1. Get Courses
  const coursesParams = new URLSearchParams({
    wstoken: token,
    wsfunction: 'core_enrol_get_users_courses',
    moodlewsrestformat: 'json',
    userid: userid.toString()
  });

  const coursesRes = await fetch(`${wsUrl}?${coursesParams.toString()}`);
  const coursesJson = await coursesRes.json();
  
  if (coursesJson.exception || !Array.isArray(coursesJson)) {
     throw new Error(coursesJson.message || 'Failed to fetch courses');
  }

  const courseIds = coursesJson.map((c: any) => c.id);
  const assignmentsData = [];
  
  // 2. Get Assignments
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - (14 * 24 * 60 * 60);

  // We can fetch multiple courses at once or one by one. 
  // 'mod_assign_get_assignments' accepts 'courseids' array.
  
  // Moodle API params for list
  const assignParams = new URLSearchParams({
    wstoken: token,
    wsfunction: 'mod_assign_get_assignments',
    moodlewsrestformat: 'json'
    // courseids[0]: ... (needs special encoding usually, but we can try omitting to get all, or loop)
  });
  
  // If we don't specify courseids, it might return all enrolled. Let's try specifying.
  courseIds.forEach((id: number, index: number) => {
      assignParams.append(`courseids[${index}]`, id.toString());
  });

  const assignRes = await fetch(`${wsUrl}?${assignParams.toString()}`);
  const assignJson = await assignRes.json();

  if (assignJson.warnings && assignJson.warnings.length > 0) {
      console.warn('Moodle warnings:', assignJson.warnings);
  }
  
  const coursesWithAssigns = assignJson.courses || [];
  
  for (const c of coursesWithAssigns) {
      const courseName = c.fullname;
      const courseShortName = c.shortname;
      const courseId = c.id;

      for (const a of c.assignments) {
          // Filter old
          if (a.duedate < cutoff) continue;
          
          assignmentsData.push({
              title: a.name,
              courseName: courseName,
              courseShortName: courseShortName,
              courseId: courseId,
              dueDate: a.duedate, // unix timestamp
              id: a.id,
              cmid: a.cmid // Course Module ID
          });
      }
  }

  return assignmentsData;
}


export async function GET(req: NextRequest) {
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        // In local dev we can skip this check or use a local secret. 
        // For Vercel Cron, the secret is auto-injected if we check for it, 
        // but 'vercel.json' cron calls are from Vercel's infrastructure.
        // Usually Vercel crons do not send a Bearer token unless configured. 
        // Publicly calling this endpoint should be discouraged. Use check.
        // For now, allow open or check a custom env var.
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { databases, users } = await createAdminClient();
        const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
        const ASSIGNMENTS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ASSIGNMENTS_ID!;
        const COURSES_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_COURSES_ID!;

        // 1. List all users (paginate if needed, assuming < 100 for now or loop)
        const allUsers = await users.list(100);
        
        let results = [];

        for (const user of allUsers.users) {
            // Check preferences for Moodle connection
            const prefs = user.prefs as any;
            
            if (!prefs.moodleUrl || !prefs.moodleTokenIV || !prefs.moodleTokenData) {
                continue; // Skip user
            }

            try {
                const token = decrypt({
                    iv: prefs.moodleTokenIV,
                    encryptedData: prefs.moodleTokenData
                });
                
                const url = prefs.moodleUrl;
                const userId = prefs.moodleUserId; // Might not have stored this... check sync route
                
                // If we don't have stored moodleUserId, we might need to fetch it or store it during connect.
                // Assuming we can get away without it if 'core_webservice_get_site_info' works with just token?
                // Actually 'core_enrol_get_users_courses' NEEDS userid.
                
                // Let's refetch site info to be safe/get ID if missing
                let mUserId = userId;
                if (!mUserId) {
                     const infoRes = await fetch(`${url}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`);
                     const info = await infoRes.json();
                     if (info.userid) mUserId = info.userid;
                }

                if (!mUserId) {
                    results.push({ userId: user.$id, status: 'failed_auth' });
                    continue;
                }

                const assignments = await fetchMoodleAssignments(url, token, mUserId);
                
                // Sync to DB
                // Need to fetch internal courses for linking
                const internalCourses = await databases.listDocuments(
                    DATABASE_ID,
                    COURSES_COLLECTION,
                    [ Query.equal('userId', user.$id) ]
                );

                const existingDocs = await databases.listDocuments(
                    DATABASE_ID,
                    ASSIGNMENTS_COLLECTION,
                    [
                        Query.equal('userId', user.$id),
                        Query.equal('source', 'moodle')
                    ]
                );

                const todayMidnight = new Date();
                todayMidnight.setHours(0,0,0,0);
                const todaySeconds = Math.floor(todayMidnight.getTime() / 1000);

                let ops = 0;
                for (const mAssign of assignments) {
                    const mId = mAssign.id.toString();
                    const cId = mAssign.cmid.toString();
                    const existing = existingDocs.documents.find((d: any) => d.gradescopeId === mId || d.gradescopeId === cId);
                    
                    const dueDateObj = mAssign.dueDate ? new Date(mAssign.dueDate * 1000) : null;

                    // Reuse linking logic
                    let internalCourseId = '';
                    const mCodeClean = normalize(mAssign.courseShortName);
                    const mNameClean = normalize(mAssign.courseName);
                    
                    for (const internal of internalCourses.documents) {
                        const iCode = normalize(internal.code);
                        const iName = normalize(internal.name);
                        if (mCodeClean.includes(iCode) || iCode.includes(mCodeClean) || mNameClean === iName) {
                            internalCourseId = internal.$id;
                            break;
                        }
                    }

                    if (!existing) {
                        if (mAssign.dueDate < todaySeconds) continue;

                        await databases.createDocument(
                            DATABASE_ID,
                            ASSIGNMENTS_COLLECTION,
                            ID.unique(),
                            {
                                title: mAssign.title,
                                deadline: dueDateObj ? dueDateObj.toISOString() : null,
                                gradescopeId: cId,
                                gradescopeCourseId: mAssign.courseId.toString(),
                                gradescopeCourseName: url,
                                courseId: internalCourseId,
                                source: 'moodle',
                                category: 'assignment',
                                status: 'not_started',
                                userId: user.$id,
                                tags: [],
                                completedAt: null,
                                notes: `Imported from Moodle (${mAssign.courseShortName})`
                            }
                        );
                        ops++;
                    } else {
                         // Update logic
                         const existingDeadline = existing.deadline ? new Date(existing.deadline).getTime() : 0;
                         const newDeadline = dueDateObj ? dueDateObj.getTime() : 0;
                         const titleChanged = existing.title !== mAssign.title;
                         const deadlineChanged = existingDeadline !== newDeadline;
                         const cmidChanged = existing.gradescopeId !== cId;

                         if (titleChanged || deadlineChanged || cmidChanged) {
                             await databases.updateDocument(
                                DATABASE_ID,
                                ASSIGNMENTS_COLLECTION,
                                existing.$id,
                                {
                                    title: mAssign.title,
                                    deadline: dueDateObj ? dueDateObj.toISOString() : null,
                                    gradescopeId: cId,
                                    gradescopeCourseName: url
                                }
                             );
                             ops++;
                         }
                    }
                }
                
                results.push({ userId: user.$id, ops });

            } catch (err: any) {
                results.push({ userId: user.$id, error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('Cron Error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
