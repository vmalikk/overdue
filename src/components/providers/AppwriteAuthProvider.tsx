'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { account } from '@/lib/appwrite/client'
import { Models, OAuthProvider, ID } from 'appwrite'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useGradescopeStore } from '@/store/gradescopeStore'
import { useMoodleStore } from '@/store/moodleStore'
import { useNextcloudStore } from '@/store/nextcloudStore'
import { useSolverStore } from '@/store/solverStore'
import { useUIStore } from '@/store/uiStore'

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => void
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string, secret: string, userId: string, passwordAgain: string) => Promise<void>
  verifyEmail: (userId: string, secret: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => { },
  signInWithGoogle: () => { },
  signInWithEmail: async () => { },
  signUpWithEmail: async () => { },
  resetPassword: async () => { },
  updatePassword: async () => { },
  verifyEmail: async () => { },
  sendVerificationEmail: async () => { },
})

export function AppwriteAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [loading, setLoading] = useState(true)

  const setAssignmentUserId = useAssignmentStore((state) => state.setUserId)
  const setCoursesUserId = useCourseStore((state) => state.setUserId)
  const loadAssignments = useAssignmentStore((state) => state.loadAssignments)
  const loadCourses = useCourseStore((state) => state.loadCourses)
  const checkGradescopeStatus = useGradescopeStore((state) => state.checkStatus)
  const checkMoodleStatus = useMoodleStore((state) => state.checkStatus)
  const checkNextcloudStatus = useNextcloudStore((state) => state.checkStatus)
  const checkSolverStatus = useSolverStore((state) => state.checkStatus)
  const setDevUnlocked = useUIStore((state) => state.setDevUnlocked)

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
      // Hydrate integration connection status from server
      // (non-blocking — don't await so it doesn't slow down initial load)
      checkGradescopeStatus().catch(() => {})
      checkMoodleStatus().catch(() => {})
      checkNextcloudStatus().catch(() => {})
      checkSolverStatus().catch(() => {})
      // Hydrate dev unlock status from user prefs
      if (currentUser.prefs?.devUnlocked) {
        setDevUnlocked(true)
      }
    } catch (error) {
      setUser(null)
      setAssignmentUserId(null)
      setCoursesUserId(null)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = () => {
    // Use token-based OAuth to handle cross-site cookie issues
    account.createOAuth2Token(
      OAuthProvider.Google,
      `${window.location.origin}/auth/callback`,
      `${window.location.origin}/login?error=auth`
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
    // Hydrate integration connection status from server
    checkGradescopeStatus().catch(() => {})
    checkMoodleStatus().catch(() => {})
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
    // Hydrate integration connection status from server
    checkGradescopeStatus().catch(() => {})
    checkMoodleStatus().catch(() => {})
  }

  const resetPassword = async (email: string) => {
    // Redirect back to /reset-password page with userId and secret
    await account.createRecovery(
      email,
      `${window.location.origin}/reset-password`
    )
  }

  const updatePassword = async (password: string, secret: string, userId: string, passwordAgain: string) => {
    await account.updateRecovery(userId, secret, password)
  }


  const verifyEmail = async (userId: string, secret: string) => {
    await account.updateVerification(userId, secret)
    // Refresh user to update verification status
    await checkUser()
  }

  const sendVerificationEmail = async () => {
    await account.createVerification(`${window.location.origin}/verify-email`)
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
    <AuthContext.Provider value={{ user, loading, signOut, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, updatePassword, verifyEmail, sendVerificationEmail }}>
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
