import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import TestCases from './pages/TestCases'
import TestExecutions from './pages/TestExecutions'
import Reports from './pages/Reports'
// API测试相关页面
import Interfaces from './pages/ApiTesting/Interfaces'
import TestScenes from './pages/ApiTesting/TestScenes'
import Mock from './pages/ApiTesting/Mock'
// 其他页面
import QuickTest from './pages/QuickTest'
import Performance from './pages/Performance'
import UIAutomation from './pages/UIAutomation'
import Settings from './pages/Settings'
import PersonalCenter from './pages/PersonalCenter'
import Modules from './pages/Modules'
import Directories from './pages/Directories'
import AssertionLibraries from './pages/AssertionLibraries'
import DataDrivers from './pages/DataDrivers'
import TestCaseReviews from './pages/TestCaseReviews'
import Environments from './pages/Environments'
import TokenConfigs from './pages/TokenConfigs'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/projects" element={<Projects />} />
                      {/* API测试模块 */}
                      <Route path="/api-testing/interfaces" element={<Interfaces />} />
                      <Route path="/api-testing/test-cases" element={<TestCases />} />
                      <Route path="/api-testing/modules" element={<Modules />} />
                      <Route path="/api-testing/directories" element={<Directories />} />
                      <Route path="/api-testing/assertion-libraries" element={<AssertionLibraries />} />
                      <Route path="/api-testing/data-drivers" element={<DataDrivers />} />
                      <Route path="/api-testing/test-case-reviews" element={<TestCaseReviews />} />
                      <Route path="/api-testing/test-executions" element={<TestExecutions />} />
                      <Route path="/api-testing/test-scenes" element={<TestScenes />} />
                      <Route path="/api-testing/reports" element={<Reports />} />
                      <Route path="/api-testing/mock" element={<Mock />} />
                      {/* 其他功能 */}
                      <Route path="/quick-test" element={<QuickTest />} />
                      <Route path="/performance" element={<Performance />} />
                      <Route path="/ui-automation" element={<UIAutomation />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/environments" element={<Environments />} />
                      <Route path="/settings/token-configs" element={<TokenConfigs />} />
                      <Route path="/personal" element={<PersonalCenter />} />
                    </Routes>
                  </ErrorBoundary>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App

