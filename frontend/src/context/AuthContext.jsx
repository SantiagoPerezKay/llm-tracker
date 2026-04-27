import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'llm_tracker_token'
const USER_KEY  = 'llm_tracker_user'

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem(TOKEN_KEY) ?? null)
  const [username, setUsername] = useState(() => localStorage.getItem(USER_KEY)  ?? null)

  const login = useCallback((newToken, newUsername) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, newUsername)
    setToken(newToken)
    setUsername(newUsername)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUsername(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, username, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
