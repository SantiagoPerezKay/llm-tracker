import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { dark, toggle } = useTheme()
  const { username, logout } = useAuth()

  const [spending, setSpending] = useState(null)

  useEffect(() => {
    api.getSpending()
      .then(data => setSpending(data))
      .catch(() => {})
  }, [pathname]) // re-fetch when navigating (after analyses complete)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const formatCost = (usd) => {
    if (usd === null || usd === undefined) return null
    if (usd < 0.001) return '< $0.001'
    if (usd < 1) return `$${usd.toFixed(4)}`
    return `$${usd.toFixed(2)}`
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/assets/sembi-logo.webp" alt="Sembi logo" className="h-8 w-auto object-contain" />
          <span className="font-bold text-gray-900 dark:text-gray-50 text-base sm:text-lg leading-tight">
            LLM <span className="text-indigo-500">Brand</span> Tracker
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Total spending pill */}
          {spending !== null && (
            <Link
              to="/schedules"
              title={`${spending.total_analyses} análisis · ${spending.total_tokens?.toLocaleString()} tokens`}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {formatCost(spending.total_cost_usd)}
              </span>
              <span className="text-xs text-amber-500 dark:text-amber-500/70">total</span>
            </Link>
          )}

          {/* Provider pills */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">GPT-4.1</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Gemini 2.0</span>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {dark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707
                     M6.343 17.657l-.707.707m12.728 0l-.707-.707
                     M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Schedules link */}
          <Link
            to="/schedules"
            title="Análisis programados"
            className={`p-2 rounded-lg transition-colors ${
              pathname === '/schedules'
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>

          {/* Username + logout */}
          {username && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{username}</span>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}

          {/* New analysis CTA */}
          {pathname !== '/nuevo' && (
            <Link
              to="/nuevo"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all whitespace-nowrap shadow-sm"
            >
              <span className="hidden sm:inline">+ Nuevo análisis</span>
              <span className="sm:hidden">+</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
