import { Routes, Route } from 'react-router-dom';
import LogUploadPage from './pages/LogUploadPage';
import DashboardPage from './pages/DashboardPage';
import StatusOverviewPage from './pages/StatusOverviewPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LogUploadPage />} />
        <Route path="/status/:logId" element={<StatusOverviewPage />} />
        <Route path="/dashboard/:logId" element={<DashboardPage />} />
      </Routes>
    </>
  );
}

export default App;
