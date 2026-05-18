import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDoctor } from './hooks/useDoctor';
import Layout from './components/Layout';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import FAQs from './pages/FAQs';
import Appointments from './pages/Appointments';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
  const { session, loading } = useDoctor();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    );
  }

  return session ? children : <Navigate to="/login" replace />;
}

function OnboardingGuard({ children }) {
  const { doctor, loading } = useDoctor();
  if (loading) return null;
  if (!doctor) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/onboarding"
          element={
            <PrivateRoute>
              <Onboarding />
            </PrivateRoute>
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <OnboardingGuard>
                <Layout />
              </OnboardingGuard>
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="faqs" element={<FAQs />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
