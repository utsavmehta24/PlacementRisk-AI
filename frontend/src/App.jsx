import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentView from './pages/StudentView';
import Alerts from './pages/Alerts';
import AdminDashboard from './pages/AdminDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import RiskHeadDashboard from './pages/RiskHeadDashboard';
import StudentPortal from './pages/StudentPortal';
import LandingPage from './pages/LandingPage';
import StudentSignup from './pages/StudentSignup';

function App() {
  const isAuthenticated = () => localStorage.getItem('token') !== null;
  const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');

  const PrivateRoute = ({ children, roles = null }) => {
    if (!isAuthenticated()) return <Navigate to="/login" />;
    if (roles && !roles.includes(getUser().role)) return <Navigate to={getUser().home_route || '/'} />;
    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/student-signup" element={<StudentSignup />} />
          <Route path="/home" element={<PrivateRoute><Navigate to={getUser().home_route || '/admin'} /></PrivateRoute>} />

          {/* Admin — system management, users, institutes, ops */}
          <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />

          {/* Risk Head — portfolio analytics, heatmap, alerts, case overview */}
          <Route path="/risk-head" element={<PrivateRoute roles={['risk_head']}><RiskHeadDashboard /></PrivateRoute>} />

          {/* Officer — individual case workbench, student messaging */}
          <Route path="/officer" element={<PrivateRoute roles={['risk_head', 'loan_officer']}><OfficerDashboard /></PrivateRoute>} />

          {/* Student portal */}
          <Route path="/student-portal" element={<PrivateRoute roles={['student']}><StudentPortal /></PrivateRoute>} />

          {/* Shared routes */}
          <Route path="/student/:id" element={<PrivateRoute roles={['admin', 'risk_head', 'loan_officer']}><StudentView /></PrivateRoute>} />
          <Route path="/alerts" element={<PrivateRoute roles={['admin', 'risk_head', 'loan_officer']}><Alerts /></PrivateRoute>} />
          <Route path="/legacy-dashboard" element={<PrivateRoute roles={['admin', 'risk_head', 'loan_officer']}><Dashboard /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');

  const PrivateRoute = ({ children, roles = null }) => {
    if (!isAuthenticated()) return <Navigate to="/login" />;
    if (roles && !roles.includes(getUser().role)) return <Navigate to={(getUser().home_route || '/')} />;
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/student-signup" element={<StudentSignup />} />
          <Route 
            path="/home" 
            element={
              <PrivateRoute>
                <Navigate to={(getUser().home_route || '/admin')} />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/officer" 
            element={
              <PrivateRoute roles={['risk_head', 'loan_officer']}>
                <OfficerDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/student-portal" 
            element={
              <PrivateRoute roles={['student']}>
                <StudentPortal />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/legacy-dashboard" 
            element={
              <PrivateRoute roles={['admin', 'risk_head', 'loan_officer']}>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/student/:id" 
            element={
              <PrivateRoute roles={['admin', 'risk_head', 'loan_officer']}>
                <StudentView />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/alerts" 
            element={
              <PrivateRoute roles={['admin', 'risk_head', 'loan_officer']}>
                <Alerts />
              </PrivateRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
