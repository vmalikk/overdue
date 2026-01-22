'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { account } from '@/lib/appwrite/client'
import { Models, OAuthProvider } from 'appwrite'

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  signInWithGoogle: async () => {},
})

export function AppwriteAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await account.get()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    const successUrl = window.location.origin
    const failureUrl = `${window.location.origin}/login?error=auth`
    
    account.createOAuth2Session(
      OAuthProvider.Google,
      successUrl,
      failureUrl,
      // Request Google Calendar scopes
      ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
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
