import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Company from './pages/hr/Company';
import HRDashboard from './pages/hr/HRDashboard';
import Jobs from './pages/hr/Jobs';
import Candidates from './pages/hr/Candidates';
import CandidateDetail from './pages/hr/CandidateDetail';
import Rankings from './pages/hr/Rankings';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import ResumeUpload from './pages/candidate/ResumeUpload';
import Assessments from './pages/candidate/Assessments';
import Interview from './pages/candidate/Interview';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: string }> = ({ children, role }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'hr' ? '/hr/dashboard' : '/candidate/dashboard'} replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'hr' ? '/hr/dashboard' : '/candidate/dashboard'} /> : <Login />} />
      {/* /register is HR only — candidates are created by HR, not self-registered */}
      <Route path="/register" element={user ? <Navigate to="/hr/dashboard" /> : <Register />} />

      {/* HR Routes */}
      <Route path="/hr/*" element={
        <ProtectedRoute role="hr">
          <Layout>
            <Routes>
              <Route path="dashboard" element={<HRDashboard />} />
              <Route path="company" element={<Company />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="candidates/:id" element={<CandidateDetail />} />
              <Route path="rankings" element={<Rankings />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Candidate Routes */}
      <Route path="/candidate/*" element={
        <ProtectedRoute role="candidate">
          <Layout>
            <Routes>
              <Route path="dashboard" element={<CandidateDashboard />} />
              <Route path="resume" element={<ResumeUpload />} />
              <Route path="assessments" element={<Assessments />} />
              <Route path="interview" element={<Interview />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' }
      }} />
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
