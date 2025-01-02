import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { Navbar } from './components/layout/navbar';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { RestaurantDashboard } from './pages/dashboard/restaurant';
import { SupplierDashboard } from './pages/dashboard/supplier';
import { SupplierProductsPage } from './pages/supplier/products';
import { SupabaseProvider } from './lib/supabase-context';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function DashboardRoute() {
  const { profile } = useAuthStore();

  console.log('Dashboard Route - Profile:', profile);

  if (!profile) {
    console.log('No profile found, redirecting to login');
    return <Navigate to="/login" />;
  }

  console.log('Rendering dashboard for type:', profile.type);
  return profile.type === 'restaurant' ? <RestaurantDashboard /> : <SupplierDashboard />;
}

export default function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <SupabaseProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/supplier/:supplierId"
              element={
                <ProtectedRoute>
                  <SupplierProductsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </SupabaseProvider>
  );
}