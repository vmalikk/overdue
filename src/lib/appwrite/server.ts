import { Client, Account, Users, Databases } from "node-appwrite"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"

const APPWRITE_ENDPOINT = "https://nyc.cloud.appwrite.io/v1"
const APPWRITE_PROJECT_ID = "6971c59b000e2766561b"

// Create a client with the user's session for reading their data
export async function createSessionClient(request?: NextRequest) {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)

  // 1. Try JWT from Headers (for API routes)
  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      client.setJWT(token)
      return { account: new Account(client) }
    }
  }

  // 2. Try Cookie (for SSR/Server Actions)
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(`a_session_${APPWRITE_PROJECT_ID}`)

  if (sessionCookie?.value) {
    client.setSession(sessionCookie.value)
    return { account: new Account(client) }
  }

  throw new Error("No session")
}

// Create an admin client for operations that need elevated permissions
export function createAdminClient() {
  const apiKey = process.env.APPWRITE_API_KEY
  if (!apiKey) {
    throw new Error("APPWRITE_API_KEY environment variable is not set")
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(apiKey)

  return {
    users: new Users(client),
    databases: new Databases(client)
  }
}

// Get the current user from session
export async function getCurrentUser(request?: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    return await account.get()
  } catch (e) {
    return null
  }
}
