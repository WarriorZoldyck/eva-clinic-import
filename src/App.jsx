import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import TreatmentPlans from './pages/TreatmentPlans';
import Financial from './pages/Financial';
import Inventory from './pages/Inventory';
import AssistantEVA from './pages/AssistantEVA';
import Login from './pages/Login';
import Register from './pages/Register';
import SurgicalGuide from './pages/ScanPlanner';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas de Acesso */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />

            {/* Rotas Protegidas do Sistema */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <Agenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pacientes"
              element={
                <ProtectedRoute>
                  <Patients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pacientes/:id"
              element={
                <ProtectedRoute>
                  <PatientDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tratamentos"
              element={
                <ProtectedRoute>
                  <TreatmentPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <Financial />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estoque"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assistente-eva"
              element={
                <ProtectedRoute>
                  <AssistantEVA />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guia-cirurgico"
              element={
                <ProtectedRoute>
                  <SurgicalGuide />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
