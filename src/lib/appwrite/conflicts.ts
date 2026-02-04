import { Client, Databases, Query, ID, Permission, Role } from "appwrite"
import { GradescopeConflict, ConflictResolution } from '@/types/gradescope'

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("6971c59b000e2766561b")

const databases = new Databases(client)

const DATABASE_ID = "6971d0970008b1d89c01"
const CONFLICTS_COLLECTION = "conflicts"

export async function getAllConflicts(userId: string): Promise<GradescopeConflict[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    CONFLICTS_COLLECTION,
    [
      Query.equal('userId', userId),
      Query.equal('resolved', false),
      Query.orderDesc('$createdAt')
    ]
  )
  return response.documents.map(mapDocumentToConflict)
}

export async function getConflict(id: string): Promise<GradescopeConflict | undefined> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, CONFLICTS_COLLECTION, id)
    return mapDocumentToConflict(doc)
  } catch {
    return undefined
  }
}

export async function createConflict(
  conflict: Omit<GradescopeConflict, 'id' | 'createdAt' | 'resolvedAt' | 'resolved' | 'resolution'>,
  userId: string
): Promise<GradescopeConflict> {
  const doc = await databases.createDocument(
    DATABASE_ID,
    CONFLICTS_COLLECTION,
    ID.unique(),
    {
      userId: userId,
      manualAssignmentId: conflict.manualAssignmentId,
      gradescopeTitle: conflict.gradescopeTitle,
      gradescopeDeadline: conflict.gradescopeDeadline instanceof Date
        ? conflict.gradescopeDeadline.toISOString()
        : conflict.gradescopeDeadline,
      gradescopeCourseId: conflict.gradescopeCourseId,
      gradescopeCourseName: conflict.gradescopeCourseName,
      gradescopeData: conflict.gradescopeData,
      resolved: false,
      resolution: null,
      resolvedAt: null
    },
    [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  )
  return mapDocumentToConflict(doc)
}

export async function resolveConflict(
  id: string,
  resolution: ConflictResolution
): Promise<GradescopeConflict> {
  const doc = await databases.updateDocument(
    DATABASE_ID,
    CONFLICTS_COLLECTION,
    id,
    {
      resolved: true,
      resolution: resolution,
      resolvedAt: new Date().toISOString()
    }
  )
  return mapDocumentToConflict(doc)
}

export async function deleteConflict(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, CONFLICTS_COLLECTION, id)
}

export async function getUnresolvedConflictCount(userId: string): Promise<number> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    CONFLICTS_COLLECTION,
    [
      Query.equal('userId', userId),
      Query.equal('resolved', false),
      Query.limit(1)
    ]
  )
  return response.total
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocumentToConflict(doc: any): GradescopeConflict {
  return {
    id: doc.$id,
    userId: doc.userId,
    manualAssignmentId: doc.manualAssignmentId,
    gradescopeTitle: doc.gradescopeTitle,
    gradescopeDeadline: new Date(doc.gradescopeDeadline),
    gradescopeCourseId: doc.gradescopeCourseId,
    gradescopeCourseName: doc.gradescopeCourseName,
    gradescopeData: doc.gradescopeData,
    resolved: doc.resolved,
    resolution: doc.resolution as ConflictResolution | undefined,
    createdAt: new Date(doc.$createdAt),
    resolvedAt: doc.resolvedAt ? new Date(doc.resolvedAt) : undefined
  }
}
