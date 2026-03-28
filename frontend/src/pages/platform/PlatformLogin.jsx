import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function PlatformLogin() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      const { token, admin } = response.data;

      if (!admin.is_platform_admin) {
        toast.error('This account does not have Super Admin access.');
        setLoading(false);
        return;
      }

      // Clear any stale restaurant admin session first
      localStorage.clear();
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(admin));
      toast.success('Welcome, Super Admin!');
      // Use hard navigation to ensure fresh page load with no stale React state
      window.location.href = '/platform';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-700/30 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-700/30 rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 text-center text-white max-w-sm">
          <div className="w-20 h-20 mx-auto bg-white/15 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-3">Platform Control</h2>
          <p className="text-purple-200 text-lg leading-relaxed">
            Super admin access to manage all restaurants, subscriptions, and platform data.
          </p>

          <div className="mt-10 space-y-3 text-left">
            {[
              'View all registered restaurants',
              'Manage subscription statuses',
              'Monitor orders & activity',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3 backdrop-blur-sm border border-white/10">
                <div className="w-2 h-2 rounded-full bg-purple-300 shrink-0" />
                <span className="text-sm text-purple-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 px-6">
        <div className="w-full max-w-md">
          {/* Mobile icon */}
          <div className="lg:hidden flex justify-center mb-6">
            <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-1">Super Admin Login</h1>
          <p className="text-gray-400 mb-8 text-sm">Sign in with your platform admin credentials.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300 text-sm">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="superadmin@platform.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="email-input"
                className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-300 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="password-input"
                  className="h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white mt-2 transition-colors"
              data-testid="submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In as Super Admin'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-700">
              <Link to="/admin/login" className="hover:text-gray-500 transition-colors">
                ← Regular admin login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
