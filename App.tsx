import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Analytics } from './pages/Analytics.tsx';
import { ContentStudio } from './pages/ContentStudio.tsx';
import { ContentCalendar } from './pages/ContentCalendar.tsx';
import { Campaigns } from './pages/Campaigns.tsx';
import { MemoryLab } from './pages/MemoryLab.tsx';
import { MemoryActivity } from './pages/MemoryActivity.tsx';
import { AudienceFeedback } from './pages/AudienceFeedback.tsx';
import { Settings } from './pages/Settings.tsx';
import { Integrations } from './pages/Integrations.tsx';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="studio" element={<ContentStudio />} />
            <Route path="calendar" element={<ContentCalendar />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="memory-lab" element={<MemoryLab />} />
            <Route path="memory-activity" element={<MemoryActivity />} />
            <Route path="feedback" element={<AudienceFeedback />} />
            <Route path="settings" element={<Settings />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
