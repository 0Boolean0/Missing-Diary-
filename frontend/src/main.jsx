import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportCase from './pages/ReportCase';
import CaseDetails from './pages/CaseDetails';
import SubmitSighting from './pages/SubmitSighting';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cases/:id" element={<CaseDetails />} />
          <Route path="/sighting/:id?" element={<Protected><SubmitSighting /></Protected>} />
          <Route path="/report" element={<Protected><ReportCase /></Protected>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
