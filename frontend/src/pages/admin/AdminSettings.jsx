import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { uploadAPI } from '../../lib/api';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Palette, DollarSign, ImageIcon, Save, Upload, X, Image, CreditCard, Check, Crown, Zap, Building2 } from 'lucide-react';

export default function AdminSettings() {
  const [searchParams] = useSearchParams();
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState({});
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [tenant, setTenant] = useState(null);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: settings.name || '',
    logo_url: settings.logo_url || '',
    primary_color: settings.primary_color || '#5A6B5D',
    secondary_color: settings.secondary_color || '#E8E6E1',
    currency: settings.currency || 'EUR',
    currency_symbol: settings.currency_symbol || '€',
  });

  // Load tenant and subscription plans
  useEffect(() => {
    const storedTenant = localStorage.getItem('tenant');
    if (storedTenant) {
      setTenant(JSON.parse(storedTenant));
    }
    loadSubscriptionPlans();
  }, []);

  // Check for payment status in URL
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paymentStatus = searchParams.get('payment');
    
    if (sessionId && paymentStatus === 'success') {
      pollPaymentStatus(sessionId);
    } else if (paymentStatus === 'cancelled') {
      toast.info('Betaling geannuleerd');
    }
  }, [searchParams]);

  const loadSubscriptionPlans = async () => {
    try {
      const response = await api.get('/subscription/plans');
      setSubscriptionPlans(response.data.plans);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      toast.info('Betaling wordt verwerkt. Controleer uw email voor bevestiging.');
      return;
    }

    try {
      setProcessingPayment(true);
      const response = await api.get(`/subscription/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        toast.success('Abonnement succesvol geactiveerd!');
        // Refresh tenant data
        const meResponse = await api.get('/auth/me');
        if (meResponse.data.tenant) {
          localStorage.setItem('tenant', JSON.stringify(meResponse.data.tenant));
          setTenant(meResponse.data.tenant);
        }
        setProcessingPayment(false);
        // Remove query params
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment:', error);
      setProcessingPayment(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      setProcessingPayment(true);
      const response = await api.post('/subscription/checkout', {
        plan_id: planId,
        origin_url: window.location.origin
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Kon checkout niet starten');
      setProcessingPayment(false);
    }
  };

  // Update form when settings load
  useEffect(() => {
    if (!settingsLoading) {
      setForm({
        name: settings.name || '',
        logo_url: settings.logo_url || '',
        primary_color: settings.primary_color || '#5A6B5D',
        secondary_color: settings.secondary_color || '#E8E6E1',
        currency: settings.currency || 'EUR',
        currency_symbol: settings.currency_symbol || '€',
      });
    }
  }, [settings, settingsLoading]);

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bestand is te groot. Maximum is 5MB.');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadAPI.uploadLogo(file);
      const logoUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.logo_url}`;
      setForm(prev => ({ ...prev, logo_url: logoUrl }));
      toast.success('Logo geüpload!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Logo uploaden mislukt');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setForm(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success('Instellingen opgeslagen');
    } catch (error) {
      toast.error('Instellingen opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const colorPresets = [
    { name: 'Salie Groen', primary: '#5A6B5D', secondary: '#E8E6E1' },
    { name: 'Oceaan Blauw', primary: '#2563EB', secondary: '#DBEAFE' },
    { name: 'Warm Oranje', primary: '#EA580C', secondary: '#FED7AA' },
    { name: 'Koninklijk Paars', primary: '#7C3AED', secondary: '#EDE9FE' },
    { name: 'Roos', primary: '#E11D48', secondary: '#FCE7F3' },
    { name: 'Leisteen', primary: '#475569', secondary: '#F1F5F9' },
  ];

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">Instellingen</h1>
        <p className="text-muted-foreground">Pas de uitstraling van uw restaurant aan</p>
      </div>

      {/* Subscription Status */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Abonnement
          </CardTitle>
          <CardDescription>Beheer uw abonnement en facturen</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Status */}
          <div className="mb-6 p-4 bg-card rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Huidige status</span>
              <Badge className={
                tenant?.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                tenant?.subscription_status === 'trial' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }>
                {tenant?.subscription_status === 'active' ? 'Actief' :
                 tenant?.subscription_status === 'trial' ? 'Proefperiode' :
                 tenant?.subscription_status || 'Onbekend'}
              </Badge>
            </div>
            {tenant?.subscription_plan && tenant.subscription_status === 'active' && (
              <p className="text-sm">
                Plan: <strong>{subscriptionPlans[tenant.subscription_plan]?.name || tenant.subscription_plan}</strong>
              </p>
            )}
          </div>

          {/* Subscription Plans */}
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(subscriptionPlans).map(([planId, plan]) => {
              const isCurrentPlan = tenant?.subscription_plan === planId && tenant?.subscription_status === 'active';
              const Icon = planId === 'basic' ? Zap : planId === 'pro' ? Crown : Building2;
              
              return (
                <div 
                  key={planId}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    isCurrentPlan ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  } ${planId === 'pro' ? 'md:scale-105 shadow-lg' : ''}`}
                >
                  {planId === 'pro' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Populair</Badge>
                    </div>
                  )}
                  
                  <div className="text-center mb-4">
                    <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">€{plan.price}</span>
                      <span className="text-muted-foreground">/maand</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    {plan.features?.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan || processingPayment || loadingPlans}
                    onClick={() => handleSubscribe(planId)}
                    data-testid={`subscribe-${planId}-btn`}
                  >
                    {processingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      'Huidige Plan'
                    ) : (
                      'Abonneren'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Restaurant Informatie
            </CardTitle>
            <CardDescription>Basisinformatie over uw restaurant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Naam</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mijn Restaurant"
                data-testid="settings-name-input"
              />
            </div>
            
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-start gap-4">
                {/* Logo Preview */}
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden">
                  {form.logo_url ? (
                    <img 
                      src={form.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Image className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                
                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                    data-testid="logo-file-input"
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full"
                    data-testid="upload-logo-btn"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploaden...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Logo Uploaden
                      </>
                    )}
                  </Button>
                  
                  {form.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveLogo}
                      className="w-full text-destructive hover:text-destructive"
                      data-testid="remove-logo-btn"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Logo Verwijderen
                    </Button>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Ondersteunde formaten: JPG, PNG, GIF, WebP, SVG. Max 5MB.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Huisstijlkleuren
            </CardTitle>
            <CardDescription>Pas het kleurenschema van uw restaurant aan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Presets */}
            <div className="space-y-2">
              <Label>Kleur Voorinstellingen</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setForm({ ...form, primary_color: preset.primary, secondary_color: preset.secondary })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      form.primary_color === preset.primary 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    data-testid={`preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex gap-1 mb-2">
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full border border-border" 
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary">Primaire Kleur</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary"
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                    data-testid="primary-color-input"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    placeholder="#5A6B5D"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary">Secundaire Kleur</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary"
                    type="color"
                    value={form.secondary_color}
                    onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                    data-testid="secondary-color-input"
                  />
                  <Input
                    value={form.secondary_color}
                    onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                    placeholder="#E8E6E1"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Voorbeeld</Label>
              <div 
                className="p-6 rounded-lg border border-border"
                style={{ backgroundColor: form.secondary_color }}
              >
                <div className="flex items-center gap-3 mb-4">
                  {form.logo_url && (
                    <img 
                      src={form.logo_url} 
                      alt="Logo" 
                      className="h-10 w-auto object-contain"
                    />
                  )}
                  <h3 
                    className="font-serif text-2xl"
                    style={{ color: form.primary_color }}
                  >
                    {form.name || 'Mijn Restaurant'}
                  </h3>
                </div>
                <button
                  type="button"
                  className="px-6 py-2 rounded-full text-white font-medium"
                  style={{ backgroundColor: form.primary_color }}
                >
                  Voorbeeld Knop
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Valuta Instellingen
            </CardTitle>
            <CardDescription>Configureer uw prijsweergave</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Valuta Code</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  placeholder="EUR"
                  maxLength={3}
                  data-testid="currency-code-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Valuta Symbool</Label>
                <Input
                  id="symbol"
                  value={form.currency_symbol}
                  onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                  placeholder="€"
                  maxLength={3}
                  data-testid="currency-symbol-input"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Voorbeeld: {form.currency_symbol}19,99
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-8" data-testid="save-settings-btn">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Wijzigingen Opslaan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
