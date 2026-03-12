import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { toast } from 'sonner';
import { Loader2, Palette, DollarSign, ImageIcon, Save } from 'lucide-react';

export default function AdminSettings() {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: settings.name || '',
    logo_url: settings.logo_url || '',
    primary_color: settings.primary_color || '#5A6B5D',
    secondary_color: settings.secondary_color || '#E8E6E1',
    currency: settings.currency || 'EUR',
    currency_symbol: settings.currency_symbol || '€',
  });

  // Update form when settings load
  React.useEffect(() => {
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
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://voorbeeld.nl/logo.png"
                data-testid="settings-logo-input"
              />
              {form.logo_url && (
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <img 
                    src={form.logo_url} 
                    alt="Logo voorbeeld" 
                    className="h-16 object-contain"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
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
                <h3 
                  className="font-serif text-2xl mb-2"
                  style={{ color: form.primary_color }}
                >
                  {form.name || 'Mijn Restaurant'}
                </h3>
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
