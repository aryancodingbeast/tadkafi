import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  defaultType?: 'restaurant' | 'supplier';
}

export function AuthForm({ mode, defaultType }: AuthFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [type, setType] = useState<'restaurant' | 'supplier'>(defaultType || 'restaurant');
  const { signIn, signUp } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        // Wait a bit for the profile to be loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate('/dashboard');
      } else {
        try {
          const profile = await signUp(email, password, {
            type,
            business_name: businessName,
            contact_email: email,
          });
          console.log('Signup successful, profile:', profile);
          alert('Account created successfully! Please check your email for verification and then sign in.');
          // Wait a bit before redirecting
          await new Promise(resolve => setTimeout(resolve, 1000));
          navigate('/login');
        } catch (error: any) {
          console.error('Signup error:', error);
          if (error.message?.includes('connection')) {
            // If it's a connection error but the profile was created
            alert('Account created! Please check your email and sign in.');
            navigate('/login');
          } else {
            alert(error.message || 'Failed to create account. Please try again.');
          }
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      if (error.message?.includes('connection')) {
        // If it's just a connection error, the operation might have succeeded
        alert('Please try signing in with your credentials.');
        navigate('/login');
      } else {
        alert(error.message || 'Authentication failed. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {mode === 'signup' && (
        <>
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
              Business Name
            </label>
            <Input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Business Type</label>
            <div className="mt-2 space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="restaurant"
                  checked={type === 'restaurant'}
                  onChange={(e) => setType(e.target.value as 'restaurant')}
                  className="mr-2"
                />
                Restaurant
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="supplier"
                  checked={type === 'supplier'}
                  onChange={(e) => setType(e.target.value as 'supplier')}
                  className="mr-2"
                />
                Supplier
              </label>
            </div>
          </div>
        </>
      )}

      <Button type="submit" className="w-full">
        {mode === 'signin' ? 'Sign In' : 'Sign Up'}
      </Button>

      <div className="text-center text-sm">
        {mode === 'signin' ? (
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-500"
            >
              Sign up
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-500"
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </form>
  );
}