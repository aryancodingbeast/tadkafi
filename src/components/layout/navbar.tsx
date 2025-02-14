import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Menu, X, Store, Bell, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '../ui/button';
import { useState } from 'react';
import { CartMenu } from '../cart-menu';
import { useNotificationStore } from '@/store/notifications';
import { useUnpaidOrdersStore } from '@/store/unpaidOrders';
import { useSupabase } from '@/lib/supabase-context';
import { useEffect } from 'react';
import { getUnseenNotificationCount, subscribeToNotifications } from '@/services/notificationService';
import navBg from '@/assets/nav-bg.jpg';

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
    <nav
      className="shadow-md relative"
      style={{
        background: `url(${navBg}) center/cover no-repeat`,
        backgroundBlendMode: 'soft-light',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span
                className="text-2xl font-semibold tracking-wider transition-all duration-300 hover:opacity-90 hover:scale-105"
                style={{
                  color: 'white',
                  textShadow: '1px 1px 3px rgba(0, 0, 0, 0.2)',
                  letterSpacing: '0.15em',
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                TADKAF!
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/terms-and-conditions">
              <Button variant="outline" className="text-white hover:text-white hover:bg-[#98BFDB]">
                Terms & Conditions
              </Button>
            </Link>
            <Link to="/cancellation-and-refund-policy">
              <Button variant="outline" className="text-white hover:text-white hover:bg-[#98BFDB]">
                Refund Policy
              </Button>
            </Link>
            <Link to="/contact-us">
              <Button variant="outline" className="text-white hover:text-white hover:bg-[#98BFDB]">
                Contact Us
              </Button>
            </Link>
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-[#98BFDB]">
                    Dashboard
                  </Button>
                </Link>
                {isRestaurant && (
                  <>
                    <Link to="/products">
                      <Button variant="ghost" className="text-white hover:text-white hover:bg-[#98BFDB]">
                        Products
                      </Button>
                    </Link>
                    <Link to="/orders">
                      <Button variant="ghost" className="text-white hover:text-white hover:bg-[#98BFDB] relative">
                        Orders
                        {unpaidOrdersCount > 0 && (
                          <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                            {unpaidOrdersCount}
                          </span>
                        )}
                      </Button>
                    </Link>
                    <CartMenu />
                  </>
                )}
                {profile?.type === 'supplier' && (
                  <Link to="/supplier/notifications">
                    <Button variant="ghost" className="text-white hover:text-white hover:bg-[#98BFDB]">
                      Notifications
                      {notificationCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {notificationCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="text-white hover:text-white hover:bg-[#98BFDB]"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="ghost" className="text-white hover:text-white hover:bg-[#98BFDB]">
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-white hover:bg-[#98BFDB] p-2 rounded-md"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div
          className="md:hidden"
          style={{
            background: `url(${navBg}) center/cover no-repeat`,
            backgroundBlendMode: 'soft-light',
            filter: 'brightness(0.95)',
          }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/terms-and-conditions">
              <Button variant="outline" className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB]">
                Terms & Conditions
              </Button>
            </Link>
            <Link to="/cancellation-and-refund-policy">
              <Button variant="outline" className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB]">
                Refund Policy
              </Button>
            </Link>
            <Link to="/contact-us">
              <Button variant="outline" className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB]">
                Contact Us
              </Button>
            </Link>
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB]">
                    Dashboard
                  </Button>
                </Link>
                {isRestaurant && (
                  <>
                    <Link to="/products">
                      <Button variant="ghost" className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB]">
                        Products
                      </Button>
                    </Link>
                    <Link to="/orders">
                      <Button variant="ghost" className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB] relative">
                        Orders
                        {unpaidOrdersCount > 0 && (
                          <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                            {unpaidOrdersCount}
                          </span>
                        )}
                      </Button>
                    </Link>
                  </>
                )}
                {profile?.type === 'supplier' && (
                  <Link to="/supplier/notifications">
                    <Button variant="ghost" className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB]">
                      Notifications
                      {notificationCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {notificationCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB]"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="ghost" className="w-full text-left text-white hover:text-white hover:bg-[#98BFDB]">
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}