import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { dark, toggle } = useTheme()
  const { username, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/assets/sembi-logo.webp" alt="Sembi logo" className="h-8 w-auto object-contain" />
          <span className="font-bold text-gray-900 dark:text-gray-50 text-base sm:text-lg leading-tight">
            LLM Brand Tracker
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Provider pills — ocultos en móvil muy pequeño */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">OpenAI</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Gemini</span>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {dark ? (
              /* Sol */
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707
                     M6.343 17.657l-.707.707m12.728 0l-.707-.707
                     M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              /* Luna */
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Link a schedules */}
          <Link
            to="/schedules"
            title="Análisis programados"
            className={`p-2 rounded-lg transition-colors ${
              pathname === '/schedules'
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {/* Icono reloj/schedule */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>

          {/* Usuario + logout */}
          {username && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="font-medium text-gray-600 dark:text-gray-300">{username}</span>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}

          {/* Nuevo análisis */}
          {pathname !== '/nuevo' && (
            <Link
              to="/nuevo"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <span className="hidden sm:inline">+ Nuevo análisis</span>
              <span className="sm:hidden">+ Nuevo</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
