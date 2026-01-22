'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { account } from '@/lib/appwrite/client'
import { Models, OAuthProvider, ID } from 'appwrite'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => void
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  signInWithGoogle: () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
})

export function AppwriteAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [loading, setLoading] = useState(true)
  
  const setAssignmentUserId = useAssignmentStore((state) => state.setUserId)
  const setCoursesUserId = useCourseStore((state) => state.setUserId)
  const loadAssignments = useAssignmentStore((state) => state.loadAssignments)
  const loadCourses = useCourseStore((state) => state.loadCourses)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await account.get()
      setUser(currentUser)
      // Set userId in stores and load data
      setAssignmentUserId(currentUser.$id)
      setCoursesUserId(currentUser.$id)
      await Promise.all([loadAssignments(), loadCourses()])
    } catch (error) {
      setUser(null)
      setAssignmentUserId(null)
      setCoursesUserId(null)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = () => {
    account.createOAuth2Session(
      OAuthProvider.Google,
      "https://overdue.malikv.com/",
      "https://overdue.malikv.com/login?error=auth"
    )
  }

  const signInWithEmail = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password)
    const currentUser = await account.get()
    setUser(currentUser)
    // Set userId in stores and load data
    setAssignmentUserId(currentUser.$id)
    setCoursesUserId(currentUser.$id)
    await Promise.all([loadAssignments(), loadCourses()])
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    await account.create(ID.unique(), email, password, name)
    // Auto sign in after signup
    await account.createEmailPasswordSession(email, password)
    const currentUser = await account.get()
    setUser(currentUser)
    // Set userId in stores and load data
    setAssignmentUserId(currentUser.$id)
    setCoursesUserId(currentUser.$id)
    await Promise.all([loadAssignments(), loadCourses()])
  }

  const signOut = async () => {
    try {
      await account.deleteSession('current')
      setUser(null)
      setAssignmentUserId(null)
      setCoursesUserId(null)
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, signInWithGoogle, signInWithEmail, signUpWithEmail }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AppwriteAuthProvider')
  }
  return context
}
