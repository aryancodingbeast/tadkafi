import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users2, Zap, TrendingUp, ChevronDown } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 z-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float-slow" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float-slow-reverse" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="py-20 md:py-32">
            <div className="text-center animate-fade-in">
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
                Revolutionizing the{' '}
                <span className="text-blue-600 relative">
                  Food Supply Chain
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-blue-600 rounded-full animate-scale-x" />
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto animate-fade-in-up delay-200">
                Connect directly with suppliers, streamline your ordering process, and grow your business with our digital platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up delay-400">
                <Button
                  onClick={() => navigate('/auth/register')}
                  className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/auth/login')}
                  className="text-lg px-8 py-6 rounded-xl border-2 hover:bg-gray-50 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-12 animate-bounce">
            <ChevronDown className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're transforming how businesses connect and trade in the food industry
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                color: 'blue',
                title: 'Efficient Ordering',
                description: 'Streamline your ordering process with our digital platform. Save time and reduce errors.'
              },
              {
                icon: Users2,
                color: 'green',
                title: 'Direct Connections',
                description: 'Connect directly with verified suppliers and build lasting business relationships.'
              },
              {
                icon: TrendingUp,
                color: 'purple',
                title: 'Business Growth',
                description: 'Expand your business with access to new markets and opportunities.'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className={`w-14 h-14 bg-${feature.color}-100 rounded-xl flex items-center justify-center mb-6 transform transition-transform duration-200 hover:scale-110`}>
                  <feature.icon className={`h-7 w-7 text-${feature.color}-600`} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(30deg,#ffffff_12px,transparent_0),linear-gradient(150deg,#ffffff_12px,transparent_0),linear-gradient(30deg,#ffffff_12px,transparent_0),linear-gradient(150deg,#ffffff_12px,transparent_0),linear-gradient(30deg,#ffffff_12px,transparent_0),linear-gradient(150deg,#ffffff_12px,transparent_0)] bg-[length:80px_48px] opacity-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 animate-fade-in-left">
              <h2 className="text-4xl font-bold text-white mb-6">
                Ready to Transform Your Business?
              </h2>
              <p className="text-2xl text-blue-100">
                Join our platform today and experience the future of food supply chain management.
              </p>
            </div>
            <div className="flex gap-4 animate-fade-in-right">
              <Button
                onClick={() => navigate('/auth/register')}
                className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}