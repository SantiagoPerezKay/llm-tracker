import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import NewAnalysisPage from './pages/NewAnalysisPage'
import ReanalyzePage from './pages/ReanalyzePage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import SchedulesPage from './pages/SchedulesPage'

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas protegidas */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout><HomePage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/nuevo" element={
              <ProtectedRoute>
                <AppLayout><NewAnalysisPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/negocio/:id/nuevo" element={
              <ProtectedRoute>
                <AppLayout><ReanalyzePage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/analisis/:id" element={
              <ProtectedRoute>
                <AppLayout><DashboardPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/negocio/:id/historial" element={
              <ProtectedRoute>
                <AppLayout><HistoryPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/schedules" element={
              <ProtectedRoute>
                <AppLayout><SchedulesPage /></AppLayout>
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
