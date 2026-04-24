import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import NewAnalysisPage from './pages/NewAnalysisPage'
import ReanalyzePage from './pages/ReanalyzePage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import SchedulesPage from './pages/SchedulesPage'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/nuevo" element={<NewAnalysisPage />} />
              <Route path="/negocio/:id/nuevo" element={<ReanalyzePage />} />
              <Route path="/analisis/:id" element={<DashboardPage />} />
              <Route path="/negocio/:id/historial" element={<HistoryPage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}
