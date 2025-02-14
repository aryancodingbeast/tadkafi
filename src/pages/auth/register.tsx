import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthForm } from '@/components/auth/auth-form';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');

  useEffect(() => {
    if (type && !['restaurant', 'supplier'].includes(type)) {
      navigate('/register');
    }
  }, [type, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        {type && (
          <p className="mt-2 text-center text-sm text-gray-600">
            Registering as a {type}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <AuthForm mode="signup" defaultType={type as 'restaurant' | 'supplier' | undefined} />
        </div>
      </div>
    </div>
  );
}