import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { AuthProvider } from './context/AuthContext';
<<<<<<< Updated upstream
import { LangProvider } from './context/LangContext';
=======
import { LanguageProvider } from './context/LanguageContext';
import { OfflineQueueProvider } from './context/OfflineQueueContext';
>>>>>>> Stashed changes
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportCase from './pages/ReportCase';
import CaseDetails from './pages/CaseDetails';
import SubmitSighting from './pages/SubmitSighting';
import MissingCases from './pages/MissingCases';
import Sightings from './pages/Sightings';
import { initSyncListener } from './utils/syncQueue';

<<<<<<< Updated upstream
// Start the offline queue sync listener once on app startup
initSyncListener();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cases" element={<MissingCases />} />
            <Route path="/cases/:id" element={<CaseDetails />} />
            <Route path="/sightings" element={<Sightings />} />
            <Route path="/sighting/:id?" element={<ProtectedRoute><SubmitSighting /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><ReportCase /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
=======
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <OfflineQueueProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/cases" element={<MissingCases />} />
              <Route path="/cases/:id" element={<CaseDetails />} />
              <Route path="/sightings" element={<Sightings />} />
              {/* 3.4.2 — protected routes */}
              <Route path="/sighting/:id?" element={<ProtectedRoute><SubmitSighting /></ProtectedRoute>} />
              <Route path="/report" element={<ProtectedRoute><ReportCase /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </OfflineQueueProvider>
      </LanguageProvider>
    </AuthProvider>
>>>>>>> Stashed changes
  </React.StrictMode>
);
