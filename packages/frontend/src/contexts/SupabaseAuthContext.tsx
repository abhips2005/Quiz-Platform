import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../config/supabase'

// Types
interface DbUser {
  id: string
  auth_user_id: string
  email: string
  username: string
  firstName: string
  lastName: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  avatar?: string | null
  grade?: string | null
  school?: string | null
  subjects: string[]
  emailVerified: boolean
  lastLoginAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  username: string
  role: 'STUDENT' | 'TEACHER'
  grade?: string
  school?: string
}

interface AuthContextType {
  user: User | null
  dbUser: DbUser | null
  isLoading: boolean
  isInitialized: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  error: string | null
  clearError: () => void
}

interface AuthProviderProps {
  children: ReactNode
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const SupabaseAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 10000) // Clear error after 10 seconds
      return () => clearTimeout(timer)
    }
  }, [error])

  const clearError = () => setError(null)

  // Fetch database user with retry logic
  const fetchDbUser = async (accessToken: string, retryCount = 0): Promise<DbUser | null> => {
    const maxRetries = 3
    const retryDelay = Math.pow(2, retryCount) * 1000 // Exponential backoff

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) {
        throw new Error('API URL not configured')
      }

      const response = await fetch(`${apiUrl}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 401) {
          console.warn('Token expired or invalid, user needs to re-authenticate')
          return null
        } else if (response.status >= 500 && retryCount < maxRetries) {
          console.warn(`Server error (${response.status}), retrying in ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return fetchDbUser(accessToken, retryCount + 1)
        } else {
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch user profile`)
        }
      }

      const data = await response.json()
      return data.data?.user || null
    } catch (error: any) {
      console.error('Failed to fetch database user:', error)
      
      if (retryCount < maxRetries && !error.message?.includes('API URL')) {
        console.warn(`Retrying user fetch in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return fetchDbUser(accessToken, retryCount + 1)
      }
      
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    let authSubscription: any = null

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error('Error getting session:', error)
          setError('Failed to initialize authentication')
          setUser(null)
          setDbUser(null)
        } else {
          console.log('Initial session:', session?.user ? 'Found user' : 'No user')
          setUser(session?.user ?? null)
          
          if (session?.user && session.access_token) {
            console.log('Fetching database user...')
            const dbUserData = await fetchDbUser(session.access_token)
            if (mounted) {
              setDbUser(dbUserData)
            }
          } else {
            setDbUser(null)
          }
        }
      } catch (error: any) {
        console.error('Failed to initialize auth:', error)
        if (mounted) {
          setError('Failed to initialize authentication')
          setUser(null)
          setDbUser(null)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
          setIsInitialized(true)
        }
      }
    }

    // Set up auth state listener
    const setupAuthListener = () => {
      authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return

        console.log('Auth state changed:', event, session?.user ? 'user present' : 'no user')
        
        try {
          setUser(session?.user ?? null)
          
          if (session?.user && session.access_token) {
            setIsLoading(true)
            const dbUserData = await fetchDbUser(session.access_token)
            if (mounted) {
              setDbUser(dbUserData)
            }
          } else {
            setDbUser(null)
          }
        } catch (error: any) {
          console.error('Error in auth state change:', error)
          if (mounted) {
            setError('Authentication state error')
          }
        } finally {
          if (mounted) {
            setIsLoading(false)
          }
        }
      })
    }

    initializeAuth()
    setupAuthListener()

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.subscription?.unsubscribe()
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    console.log('Attempting login...')
    setIsLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      
      if (error) {
        console.error('Login error:', error)
        
        // Handle specific Supabase errors
        let errorMessage = 'Login failed'
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please try again later'
        } else if (error.message.includes('signup disabled')) {
          errorMessage = 'Login is currently disabled'
        } else {
          errorMessage = error.message
        }
        
        setError(errorMessage)
        throw new Error(errorMessage)
      }

      console.log('Login successful - auth state change will handle user fetch')
      // User will be automatically fetched via onAuthStateChange
    } catch (error: any) {
      setIsLoading(false)
      throw error
    }
  }

  const register = async (registerData: RegisterData) => {
    console.log('Attempting registration...')
    setIsLoading(true)
    setError(null)
    
    try {
      // Validate input
      if (!registerData.email || !registerData.password || !registerData.firstName || 
          !registerData.lastName || !registerData.username) {
        throw new Error('All required fields must be filled')
      }

      if (registerData.password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      if (registerData.username.length < 3 || registerData.username.length > 30) {
        throw new Error('Username must be between 3 and 30 characters')
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(registerData.username)) {
        throw new Error('Username can only contain letters, numbers, underscores, and hyphens')
      }

      // Check if username is available
      try {
        const apiUrl = import.meta.env.VITE_API_URL
        if (apiUrl) {
          const usernameCheck = await fetch(`${apiUrl}/auth/check-username/${registerData.username}`)
          if (usernameCheck.ok) {
            const { data } = await usernameCheck.json()
            if (!data.available) {
              throw new Error('Username is already taken')
            }
          }
        }
      } catch (checkError: any) {
        if (checkError.message === 'Username is already taken') {
          throw checkError
        }
        // Continue if username check fails (don't block registration)
        console.warn('Username availability check failed:', checkError)
      }

      // Create Supabase user
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email.trim(),
        password: registerData.password,
        options: {
          data: {
            firstName: registerData.firstName.trim(),
            lastName: registerData.lastName.trim(),
            username: registerData.username.trim(),
            role: registerData.role,
            grade: registerData.grade?.trim() || null,
            school: registerData.school?.trim() || null,
          }
        }
      })

      if (error) {
        console.error('Registration error:', error)
        
        let errorMessage = 'Registration failed'
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists'
        } else if (error.message.includes('Password should be at least 6 characters')) {
          errorMessage = 'Password must be at least 6 characters'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address'
        } else if (error.message.includes('signup disabled')) {
          errorMessage = 'Registration is currently disabled'
        } else {
          errorMessage = error.message
        }
        
        setError(errorMessage)
        throw new Error(errorMessage)
      }

      if (data.user && data.session) {
        console.log('Registration successful, syncing with database...')
        
        // Try to sync user with our database
        try {
          const apiUrl = import.meta.env.VITE_API_URL
          if (!apiUrl) {
            throw new Error('API URL not configured')
          }

          const response = await fetch(`${apiUrl}/auth/sync-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({
              auth_user_id: data.user.id,
              email: registerData.email.trim(),
              firstName: registerData.firstName.trim(),
              lastName: registerData.lastName.trim(),
              username: registerData.username.trim(),
              role: registerData.role,
              grade: registerData.grade?.trim() || undefined,
              school: registerData.school?.trim() || undefined,
            }),
          })

          if (response.ok) {
            const responseData = await response.json()
            setDbUser(responseData.data.user)
            console.log('Database sync successful')
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.warn('Database sync failed:', errorData)
            
            if (response.status === 409 && errorData.error?.includes('Username')) {
              // Delete the Supabase user if username conflict
              await supabase.auth.signOut()
              throw new Error('Username is already taken')
            }
            
            // For other errors, create minimal user object so registration isn't blocked
            const minimalUser = {
              id: data.user.id,
              auth_user_id: data.user.id,
              email: registerData.email.trim(),
              username: registerData.username.trim(),
              firstName: registerData.firstName.trim(),
              lastName: registerData.lastName.trim(),
              role: registerData.role,
              status: 'ACTIVE' as const,
              avatar: null,
              grade: registerData.grade?.trim() || null,
              school: registerData.school?.trim() || null,
              subjects: [],
              emailVerified: true,
              lastLoginAt: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
            setDbUser(minimalUser as DbUser)
            console.warn('Using minimal user data due to sync failure')
          }
        } catch (syncError: any) {
          console.error('Database sync error:', syncError)
          
          if (syncError.message === 'Username is already taken') {
            throw syncError
          }
          
          // Don't throw for other sync errors - user is still registered in Supabase
          setError('Account created but profile sync failed. Please try refreshing.')
        }
      } else {
        throw new Error('Registration completed but no user data received')
      }
    } catch (error: any) {
      setIsLoading(false)
      throw error
    }
  }

  const logout = async () => {
    console.log('Attempting logout...')
    setIsLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
        setError('Failed to logout')
        throw error
      }

      console.log('Logout successful')
      // Auth state change will handle clearing user data
    } catch (error: any) {
      setIsLoading(false)
      throw error
    }
  }

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Failed to get access token:', error)
      return null
    }
  }

  const refreshUser = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
        const dbUserData = await fetchDbUser(session.access_token)
        setDbUser(dbUserData)
      } else {
        setDbUser(null)
      }
    } catch (error: any) {
      console.error('Failed to refresh user:', error)
      setError('Failed to refresh user data')
    } finally {
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    dbUser,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    refreshUser,
    getAccessToken,
    error,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within SupabaseAuthProvider')
  }
  return context
} 