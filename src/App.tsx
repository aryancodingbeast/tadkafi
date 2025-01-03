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
import { CheckoutPage } from './pages/checkout';
import { OrdersPage } from './pages/orders';
import { SupabaseProvider } from './lib/supabase-context';
import { Toaster } from 'sonner';
import { CartProvider } from './lib/cart-context';

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

function RestaurantOnlyRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuthStore();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!profile || profile.type !== 'restaurant') {
    return <Navigate to="/dashboard" />;
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
      <CartProvider>
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
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <RestaurantOnlyRoute>
                      <OrdersPage />
                    </RestaurantOnlyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <RestaurantOnlyRoute>
                      <CheckoutPage />
                    </RestaurantOnlyRoute>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
        <Toaster position="bottom-right" />
      </CartProvider>
    </SupabaseProvider>
  );
}