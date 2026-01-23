import { Client, Databases, Query, ID } from "appwrite";
import { Assignment, AssignmentStatus, Priority } from '@/types/assignment';
import { Course } from '@/types/course';

const client = new Client()
    .setEndpoint("https://nyc.cloud.appwrite.io/v1")
    .setProject("6971c59b000e2766561b");

const databases = new Databases(client);

// Update these with your actual database and collection IDs from Appwrite Console
const DATABASE_ID = "6971d0970008b1d89c01";
const ASSIGNMENTS_COLLECTION = "assignment";
const COURSES_COLLECTION = "courses";

// === ASSIGNMENT CRUD OPERATIONS ===

export async function getAllAssignments(userId: string): Promise<Assignment[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    ASSIGNMENTS_COLLECTION,
    [Query.equal('userId', userId), Query.orderDesc('deadline')]
  );
  return response.documents.map(mapDocumentToAssignment);
}

export async function getAssignment(id: string): Promise<Assignment | undefined> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, ASSIGNMENTS_COLLECTION, id);
    return mapDocumentToAssignment(doc);
  } catch {
    return undefined;
  }
}

export async function addAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Assignment> {
  const doc = await databases.createDocument(
    DATABASE_ID,
    ASSIGNMENTS_COLLECTION,
    ID.unique(),
    {
      title: assignment.title,
      description: assignment.description || null,
      courseId: assignment.courseId,
      deadline: assignment.deadline instanceof Date ? assignment.deadline.toISOString() : assignment.deadline,
      priority: assignment.priority,
      status: assignment.status,
      estimatedHours: assignment.estimatedHours || null,
      tags: assignment.tags || [],
      notes: assignment.notes || null,
      attachmentFileId: assignment.attachmentFileId || null,
      attachmentFileName: assignment.attachmentFileName || null,
      userId: userId,
      completedAt: assignment.completedAt ? (assignment.completedAt instanceof Date ? assignment.completedAt.toISOString() : assignment.completedAt) : null,
    }
  );
  return mapDocumentToAssignment(doc);
}

export async function updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment> {
  const updateData: Record<string, unknown> = {
    ...updates,
  };
  
  // Convert dates to ISO strings
  if (updates.deadline) {
    updateData.deadline = updates.deadline instanceof Date ? updates.deadline.toISOString() : updates.deadline;
  }
  if (updates.completedAt) {
    updateData.completedAt = updates.completedAt instanceof Date ? updates.completedAt.toISOString() : updates.completedAt;
  }
  
  // Remove fields that shouldn't be updated
  delete updateData.id;
  delete updateData.userId;
  delete updateData.createdAt;
  delete updateData.updatedAt;
  
  const doc = await databases.updateDocument(DATABASE_ID, ASSIGNMENTS_COLLECTION, id, updateData);
  return mapDocumentToAssignment(doc);
}

export async function deleteAssignment(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, ASSIGNMENTS_COLLECTION, id);
}

export async function getAssignmentsByCourse(userId: string, courseId: string): Promise<Assignment[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    ASSIGNMENTS_COLLECTION,
    [Query.equal('userId', userId), Query.equal('courseId', courseId)]
  );
  return response.documents.map(mapDocumentToAssignment);
}

export async function getAssignmentsByStatus(userId: string, status: AssignmentStatus): Promise<Assignment[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    ASSIGNMENTS_COLLECTION,
    [Query.equal('userId', userId), Query.equal('status', status)]
  );
  return response.documents.map(mapDocumentToAssignment);
}

// === COURSE CRUD OPERATIONS ===

export async function getAllCourses(userId: string): Promise<Course[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COURSES_COLLECTION,
    [Query.equal('userId', userId), Query.orderAsc('code')]
  );
  return response.documents.map(mapDocumentToCourse);
}

export async function getActiveCourses(userId: string): Promise<Course[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COURSES_COLLECTION,
    [Query.equal('userId', userId), Query.equal('active', true)]
  );
  return response.documents.map(mapDocumentToCourse);
}

export async function getCourse(id: string): Promise<Course | undefined> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COURSES_COLLECTION, id);
    return mapDocumentToCourse(doc);
  } catch {
    return undefined;
  }
}

export async function addCourse(course: Omit<Course, 'id' | 'createdAt'>, userId: string): Promise<Course> {
  const doc = await databases.createDocument(
    DATABASE_ID,
    COURSES_COLLECTION,
    ID.unique(),
    {
      code: course.code,
      name: course.name,
      color: course.color,
      instructor: course.instructor || null,
      professorEmail: course.professorEmail || null,
      officeHours: course.officeHours ? JSON.stringify(course.officeHours) : null,
      gradeWeights: course.gradeWeights ? JSON.stringify(course.gradeWeights) : null,
      description: course.description || null,
      active: course.active ?? true,
      userId: userId,
    }
  );
  return mapDocumentToCourse(doc);
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
  const updateData: Record<string, unknown> = { ...updates };
  
  if (updates.officeHours) {
    updateData.officeHours = JSON.stringify(updates.officeHours);
  }
  if (updates.gradeWeights) {
    updateData.gradeWeights = JSON.stringify(updates.gradeWeights);
  }

  // Remove fields that shouldn't be updated
  delete updateData.id;
  delete updateData.userId;
  delete updateData.createdAt;
  
  const doc = await databases.updateDocument(DATABASE_ID, COURSES_COLLECTION, id, updateData);
  return mapDocumentToCourse(doc);
}

export async function deleteCourse(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COURSES_COLLECTION, id);
}

// === HELPER FUNCTIONS ===

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocumentToAssignment(doc: any): Assignment {
  return {
    id: doc.$id,
    title: doc.title,
    description: doc.description,
    courseId: doc.courseId,
    deadline: new Date(doc.deadline),
    priority: doc.priority as Priority,
    status: doc.status as AssignmentStatus,
    estimatedHours: doc.estimatedHours,
    tags: doc.tags || [],
    notes: doc.notes,
    attachmentFileId: doc.attachmentFileId,
    attachmentFileName: doc.attachmentFileName,
    createdAt: new Date(doc.$createdAt),
    updatedAt: new Date(doc.$updatedAt),
    completedAt: doc.completedAt ? new Date(doc.completedAt) : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocumentToCourse(doc: any): Course {
  return {
    id: doc.$id,
    code: doc.code,
    name: doc.name,
    color: doc.color,
    instructor: doc.instructor,
    professorEmail: doc.professorEmail,
    officeHours: doc.officeHours ? JSON.parse(doc.officeHours) : [],
    gradeWeights: doc.gradeWeights ? JSON.parse(doc.gradeWeights) : [],
    description: doc.description,
    active: doc.active,
    createdAt: new Date(doc.$createdAt),
  };
}
