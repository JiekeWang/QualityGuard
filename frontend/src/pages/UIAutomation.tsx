import { Routes, Route, Navigate } from 'react-router-dom'
import PageObjects from './UIAutomation/PageObjects'
import UITestCases from './UIAutomation/UITestCases'
import UIExecutions from './UIAutomation/UIExecutions'
import UIReports from './UIAutomation/UIReports'
import UIRecording from './UIAutomation/UIRecording'

const UIAutomation: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ui-automation/page-objects" replace />} />
      <Route path="/page-objects" element={<PageObjects />} />
      <Route path="/test-cases" element={<UITestCases />} />
      <Route path="/recording" element={<UIRecording />} />
      <Route path="/test-executions" element={<UIExecutions />} />
      <Route path="/reports" element={<UIReports />} />
    </Routes>
  )
}

export default UIAutomation

