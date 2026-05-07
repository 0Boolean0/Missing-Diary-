import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CaseDetails from './pages/CaseDetails';
import Sightings from './pages/Sightings';
import MissingCases from './pages/MissingCases';
import ReportCase from './pages/ReportCase';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            {/* /register no longer exists — redirect to login */}
            <Route path="/register" element={<Navigate to="/login" replace />}/>
            <Route path="/cases" element={<MissingCases />} />
            <Route path="/cases/:id" element={<CaseDetails />} />
            {/* /sightings and /sighting/:id? both go to the same witness submission page */}
            <Route path="/sightings" element={<Sightings />} />
            <Route path="/sighting/:id?" element={<Sightings />} />
            {/* /report is admin-only — protected */}
            <Route path="/report" element={<ProtectedRoute><ReportCase /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  </React.StrictMode>
);
