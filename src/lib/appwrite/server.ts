import { Client, Account, Users, Databases } from "node-appwrite"
import { cookies } from "next/headers"

const APPWRITE_ENDPOINT = "https://nyc.cloud.appwrite.io/v1"
const APPWRITE_PROJECT_ID = "6971c59b000e2766561b"

// Create a client with the user's session for reading their data
export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(`a_session_${APPWRITE_PROJECT_ID}`)

  if (!sessionCookie?.value) {
    throw new Error("No session")
  }

  client.setSession(sessionCookie.value)
  return {
    account: new Account(client)
  }
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
export async function getCurrentUser() {
  try {
    const { account } = await createSessionClient()
    return await account.get()
  } catch {
    return null
  }
}
