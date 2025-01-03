import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Menu, Store, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '../ui/button';
import { useState } from 'react';
import { CartMenu } from '../cart-menu';

export function Navbar() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                  <Button variant="ghost" onClick={() => navigate('/orders')}>
                    Orders
                  </Button>
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
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/orders');
                      setIsMenuOpen(false);
                    }}
                  >
                    Orders
                  </Button>
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