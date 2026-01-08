import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardList from './pages/DashboardList'
import DashboardBuilder from './pages/DashboardBuilder'
import VisualizationDesigner from './pages/VisualizationDesigner'
import DatabaseManager from './pages/DatabaseManager'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboards" replace />} />
        <Route path="dashboards" element={<DashboardList />} />
        <Route path="dashboards/:id" element={<DashboardBuilder />} />
        <Route path="dashboards/new" element={<DashboardBuilder />} />
        <Route path="visualizations" element={<VisualizationDesigner />} />
        <Route path="visualizations/:id" element={<VisualizationDesigner />} />
        <Route path="databases" element={<DatabaseManager />} />
      </Route>
    </Routes>
  )
}

export default App
