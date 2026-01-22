'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { account } from '@/lib/appwrite/client'
import { Models, OAuthProvider } from 'appwrite'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  signInWithGoogle: () => {},
})

export function AppwriteAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await account.get()
      setUser(currentUser)
      // If on login page and user exists, redirect to home
      if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
        router.push('/')
      }
    } catch (error) {
      setUser(null)
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

  const signOut = async () => {
    try {
      await account.deleteSession('current')
      setUser(null)
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, signInWithGoogle }}>
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
