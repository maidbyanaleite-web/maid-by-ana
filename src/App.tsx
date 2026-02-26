import React, { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StaffDashboard from './pages/StaffDashboard';
import ClientDashboard from './pages/ClientDashboard';
import ManageStaff from './pages/ManageStaff';
import Clients from './pages/Clients';
import NewClient from './pages/NewClient';
import ClientDetails from './pages/ClientDetails';
import Budget from './pages/Budget';
import PublicBudget from './pages/PublicBudget';
import Receipts from './pages/Receipts';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function DashboardRouter() {
  const { isAdmin, isStaff, isClient } = useAuth();
  if (isAdmin) return <Dashboard />;
  if (isStaff) return <StaffDashboard />;
  if (isClient) return <ClientDashboard />;
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><DashboardRouter /></PrivateRoute>} />
            <Route path="/staff" element={<PrivateRoute><ManageStaff /></PrivateRoute>} />
            <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
            <Route path="/clients/new" element={<PrivateRoute><NewClient /></PrivateRoute>} />
            <Route path="/clients/:id" element={<PrivateRoute><ClientDetails /></PrivateRoute>} />
            <Route path="/budget" element={<PrivateRoute><Budget /></PrivateRoute>} />
            <Route path="/receipts" element={<PrivateRoute><Receipts /></PrivateRoute>} />
            <Route path="/public-budget" element={<PublicBudget />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}
