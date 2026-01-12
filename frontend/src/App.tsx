import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardList from './pages/DashboardList'
import DashboardBuilder from './pages/DashboardBuilder'
import VisualizationList from './pages/VisualizationList'
import VisualizationDesigner from './pages/VisualizationDesigner'
import VisualizationViewer from './pages/VisualizationViewer'
import VisualizationEditor from './pages/VisualizationEditor'
import ReportList from './pages/ReportList'
import ReportDesigner from './pages/ReportDesigner'
import ExcelReportBuilder from './pages/ExcelReportBuilder'
import DatabaseManager from './pages/DatabaseManager'
import { QueryBuilder } from './components/QueryBuilder'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboards" replace />} />
        <Route path="dashboards" element={<DashboardList />} />
        <Route path="dashboards/:id" element={<DashboardBuilder />} />
        <Route path="dashboards/new" element={<DashboardBuilder />} />
        <Route path="visualizations" element={<VisualizationList />} />
        <Route path="visualizations/new" element={<VisualizationDesigner />} />
        <Route path="visualizations/:id" element={<VisualizationViewer />} />
        <Route path="visualizations/:id/edit" element={<VisualizationEditor />} />
        <Route path="reports" element={<ReportList />} />
        <Route path="reports/new" element={<ReportDesigner />} />
        <Route path="reports/:id" element={<ReportDesigner />} />
        <Route path="excel-reports/new" element={<ExcelReportBuilder />} />
        <Route path="excel-reports/:id" element={<ExcelReportBuilder />} />
        <Route path="query-builder" element={<QueryBuilder />} />
        <Route path="databases" element={<DatabaseManager />} />
      </Route>
    </Routes>
  )
}

export default App
