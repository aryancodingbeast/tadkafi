import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Menu, Store, X, Bell, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '../ui/button';
import { useState } from 'react';
import { CartMenu } from '../cart-menu';
import { useNotificationStore } from '@/store/notifications';
import { useUnpaidOrdersStore } from '@/store/unpaidOrders';
import { useSupabase } from '@/lib/supabase-context';
import { useEffect } from 'react';
import { getUnseenNotificationCount, subscribeToNotifications } from '@/services/notificationService';

export function Navbar() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const { supabase } = useSupabase();
  const notificationCount = useNotificationStore((state) => state.count);
  const setNotificationCount = useNotificationStore((state) => state.setCount);
  const unpaidOrdersCount = useUnpaidOrdersStore((state) => state.count);
  const setUnpaidOrdersCount = useUnpaidOrdersStore((state) => state.setCount);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      if (profile?.type === 'supplier') {
        // Load initial notification count
        getUnseenNotificationCount(supabase)
          .then(setNotificationCount)
          .catch(console.error);

        // Subscribe to notification changes
        const cleanup = subscribeToNotifications(supabase, user.id, async () => {
          const count = await getUnseenNotificationCount(supabase);
          setNotificationCount(count);
        });

        return cleanup;
      } else if (profile?.type === 'restaurant') {
        // Load initial unpaid orders count
        const fetchUnpaidOrders = async () => {
          const { data, error } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'processing')
            .eq('payment_status', 'pending');

          if (!error && data) {
            setUnpaidOrdersCount(data.length);
          }
        };

        fetchUnpaidOrders();

        // Subscribe to order changes
        const channel = supabase
          .channel('orders-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `user_id=eq.${user.id}`,
            },
            async () => {
              // Refetch unpaid orders count
              const { data, error } = await supabase
                .from('orders')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'processing')
                .eq('payment_status', 'pending');

              if (!error && data) {
                setUnpaidOrdersCount(data.length);
              }
            }
          )
          .subscribe();

        return () => {
          channel.unsubscribe();
        };
      }
    }
  }, [user, profile, supabase, setNotificationCount, setUnpaidOrdersCount]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isRestaurant = profile?.type === 'restaurant';

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Store className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Tadkafi
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isRestaurant && <CartMenu />}
            {user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
                {isRestaurant && (
                  <>
                    <Button variant="ghost" onClick={() => navigate('/products')}>
                      Products
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/orders')} className="relative">
                      Orders
                      {unpaidOrdersCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {unpaidOrdersCount}
                        </span>
                      )}
                    </Button>
                  </>
                )}
                {profile?.type === 'supplier' && (
                  <Link to="/supplier/notifications" className="relative">
                    <Bell className="h-5 w-5 text-gray-600 hover:text-gray-800" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {notificationCount}
                      </span>
                    )}
                  </Link>
                )}
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/register')}>
                  Register
                </Button>
                <Button onClick={() => navigate('/login')}>
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            {isRestaurant && <CartMenu />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="ml-2"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    navigate('/dashboard');
                    setIsMenuOpen(false);
                  }}
                >
                  Dashboard
                </Button>
                {isRestaurant && (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/products');
                        setIsMenuOpen(false);
                      }}
                    >
                      Products
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start relative"
                      onClick={() => {
                        navigate('/orders');
                        setIsMenuOpen(false);
                      }}
                    >
                      Orders
                      {unpaidOrdersCount > 0 && (
                        <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {unpaidOrdersCount}
                        </span>
                      )}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    navigate('/register');
                    setIsMenuOpen(false);
                  }}
                >
                  Register
                </Button>
                <Button
                  className="w-full justify-start"
                  onClick={() => {
                    navigate('/login');
                    setIsMenuOpen(false);
                  }}
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}