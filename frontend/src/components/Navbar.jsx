import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/assets/sembi-logo.webp"
            alt="Sembi logo"
            className="h-8 w-auto object-contain"
          />
          <span className="font-bold text-gray-900 text-lg">LLM Brand Tracker</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">OpenAI</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-700">Gemini</span>
          </div>
          {pathname !== '/nuevo' && (
            <Link
              to="/nuevo"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              + Nuevo análisis
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
