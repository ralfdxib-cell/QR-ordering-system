import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { platformAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function PlatformSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    secret: '',
  });

  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await platformAPI.createPlatformAdmin(
        { name: formData.name, email: formData.email, password: formData.password },
        formData.secret
      );
      toast.success('Super admin account created! You can now log in.');
      navigate('/platform/login');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to create account.';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-6 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto bg-purple-600/20 rounded-2xl flex items-center justify-center mb-5 border border-purple-500/30">
            <KeyRound className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Super Admin</h1>
          <p className="text-gray-400 text-sm">
            One-time setup for the platform administrator account.
            <br />You'll need the <span className="text-purple-400 font-medium">platform secret key</span>.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-gray-300 text-sm">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Platform Admin"
                value={formData.name}
                onChange={handleChange('name')}
                required
                data-testid="name-input"
                className="h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-purple-500 rounded-lg"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300 text-sm">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="superadmin@platform.com"
                value={formData.email}
                onChange={handleChange('email')}
                required
                data-testid="email-input"
                className="h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-purple-500 rounded-lg"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-300 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                  minLength={8}
                  data-testid="password-input"
                  className="h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-purple-500 rounded-lg pr-12"
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

            {/* Platform Secret */}
            <div className="space-y-1.5">
              <Label htmlFor="secret" className="text-gray-300 text-sm">
                Platform Secret Key
                <span className="ml-2 text-xs text-gray-500 font-normal">(set on the server)</span>
              </Label>
              <div className="relative">
                <Input
                  id="secret"
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Platform secret key"
                  value={formData.secret}
                  onChange={handleChange('secret')}
                  required
                  data-testid="secret-input"
                  className="h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-purple-500 rounded-lg pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-purple-950/50 border border-purple-900/50 rounded-lg p-3">
              <p className="text-xs text-purple-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                The default platform secret is <code className="font-mono bg-purple-900/50 px-1 rounded">super-admin-secret-2024</code> unless changed in the server environment.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              data-testid="submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                'Create Super Admin Account'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/platform/login" className="text-purple-400 hover:text-purple-300 underline transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
