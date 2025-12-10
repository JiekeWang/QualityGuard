import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import TestCases from './pages/TestCases'
import TestPlans from './pages/TestPlans'
import TestExecutions from './pages/TestExecutions'
import Reports from './pages/Reports'
import Devices from './pages/Devices'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/test-cases" element={<TestCases />} />
                <Route path="/test-plans" element={<TestPlans />} />
                <Route path="/test-executions" element={<TestExecutions />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/devices" element={<Devices />} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

