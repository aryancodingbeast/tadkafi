import { LogIn, Menu, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Button } from '../ui/button';

export function Navbar() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Store className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Tadkafi</span>
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {!user ? (
                <>
                  <Button variant="outline" onClick={() => navigate('/register?type=restaurant')}>
                    For Restaurants
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/register?type=supplier')}>
                    For Suppliers
                  </Button>
                  <Button onClick={() => navigate('/login')}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate('/dashboard')}>
                    Dashboard
                  </Button>
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <Button variant="outline" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}