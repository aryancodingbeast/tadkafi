import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { Navbar } from './components/layout/navbar';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { RestaurantDashboard } from './pages/dashboard/restaurant';
import { SupplierDashboard } from './pages/dashboard/supplier';
import { SupplierProductsPage } from './pages/supplier/products';
import { SupplierNotificationsPage } from './pages/supplier/notifications';
import { ProductsPage } from './pages/dashboard/products';
import { CheckoutPage } from './pages/checkout';
import { OrdersPage } from './pages/orders';
import { SupabaseProvider } from './lib/supabase-context';
import { Toaster } from 'react-hot-toast';
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

function SupplierOnlyRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuthStore();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!profile || profile.type !== 'supplier') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function DashboardRoute() {
  const { profile } = useAuthStore();

  if (!profile) {
    return <Navigate to="/login" />;
  }

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
          <div className="min-h-screen">
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
                path="/products"
                element={
                  <ProtectedRoute>
                    <RestaurantOnlyRoute>
                      <ProductsPage />
                    </RestaurantOnlyRoute>
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
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supplier/notifications"
                element={
                  <ProtectedRoute>
                    <SupplierOnlyRoute>
                      <SupplierNotificationsPage />
                    </SupplierOnlyRoute>
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
            <Toaster position="bottom-right" />
          </div>
        </Router>
      </CartProvider>
    </SupabaseProvider>
  );
}