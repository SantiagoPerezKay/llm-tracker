import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import PasswordInput from '../components/PasswordInput'

export default function LoginPage() {
  const navigate  = useNavigate()
  const { login } = useAuth()
  const { dark, toggle } = useTheme()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(username.trim(), password)
      login(data.access_token, data.username)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 transition-colors duration-200">

      {/* Dark mode toggle (esquina) */}
      <button
        onClick={toggle}
        aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
        className="fixed top-4 right-4 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {dark ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo + título */}
        <div className="text-center mb-8">
          <img
            src="/assets/sembi-logo.webp"
            alt="Sembi logo"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">LLM Brand Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Iniciá sesión para continuar
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Usuario */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="sembi2026"
                required
                autoComplete="username"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100
                           dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30 transition-colors"
              />
            </div>

            {/* Contraseña */}
            <PasswordInput
              label="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando…
                </>
              ) : (
                'Ingresar →'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          LLM Brand Tracker · Powered by Sembi
        </p>
      </div>
    </div>
  )
}
