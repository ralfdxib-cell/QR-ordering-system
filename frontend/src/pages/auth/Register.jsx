import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { tenantAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Store, ArrowRight, CheckCircle } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    password: '',
    phone: ''
  });

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[-\s]+/g, '-');
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!formData.name || !formData.slug) {
        toast.error('Vul alle verplichte velden in');
        return;
      }
      setStep(2);
      return;
    }

    if (!formData.email || !formData.password) {
      toast.error('Vul email en wachtwoord in');
      return;
    }

    setLoading(true);
    try {
      const response = await tenantAPI.register(formData);
      const { token, tenant, admin } = response.data;
      
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(admin));
      localStorage.setItem('tenant', JSON.stringify(tenant));
      
      toast.success('Restaurant succesvol aangemaakt!');
      navigate('/admin');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registratie mislukt';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#5A6B5D] to-[#3d4a3f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid="register-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#5A6B5D] rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Restaurant Registreren</CardTitle>
          <CardDescription>
            Start je 14 dagen gratis proefperiode
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-6 gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#5A6B5D] text-white' : 'bg-gray-200'}`}>
              {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <div className={`w-16 h-1 ${step > 1 ? 'bg-[#5A6B5D]' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#5A6B5D] text-white' : 'bg-gray-200'}`}>
              2
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Naam *</Label>
                  <Input
                    id="name"
                    data-testid="register-name"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Pizzeria Roma"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL (automatisch gegenereerd)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/r/</span>
                    <Input
                      id="slug"
                      data-testid="register-slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="pizzeria-roma"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Je klanten bezoeken: /r/{formData.slug || 'jouw-restaurant'}/menu
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefoonnummer (optioneel)</Label>
                  <Input
                    id="phone"
                    data-testid="register-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+31 6 12345678"
                  />
                </div>

                <Button type="submit" className="w-full bg-[#5A6B5D] hover:bg-[#4a5b4d]" data-testid="register-next">
                  Volgende <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <>
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
                  <p className="text-sm font-medium">{formData.name}</p>
                  <p className="text-xs text-muted-foreground">/r/{formData.slug}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="register-email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@restaurant.nl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Wachtwoord *</Label>
                  <Input
                    id="password"
                    type="password"
                    data-testid="register-password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimaal 6 karakters"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Terug
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[#5A6B5D] hover:bg-[#4a5b4d]"
                    disabled={loading}
                    data-testid="register-submit"
                  >
                    {loading ? 'Bezig...' : 'Account Aanmaken'}
                  </Button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Al een account? </span>
            <Link to="/admin/login" className="text-[#5A6B5D] hover:underline font-medium">
              Inloggen
            </Link>
          </div>

          {/* Features list */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium text-center mb-3">Inclusief in je proefperiode:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Onbeperkt menu items
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                QR-code bestelysteem
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Keuken Display Systeem
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                White-label branding
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
