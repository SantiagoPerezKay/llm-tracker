import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import NewAnalysisPage from './pages/NewAnalysisPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/nuevo" element={<NewAnalysisPage />} />
            <Route path="/analisis/:id" element={<DashboardPage />} />
            <Route path="/negocio/:id/historial" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
