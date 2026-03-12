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
    currency: settings.currency || 'USD',
    currency_symbol: settings.currency_symbol || '$',
  });

  // Update form when settings load
  React.useEffect(() => {
    if (!settingsLoading) {
      setForm({
        name: settings.name || '',
        logo_url: settings.logo_url || '',
        primary_color: settings.primary_color || '#5A6B5D',
        secondary_color: settings.secondary_color || '#E8E6E1',
        currency: settings.currency || 'USD',
        currency_symbol: settings.currency_symbol || '$',
      });
    }
  }, [settings, settingsLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const colorPresets = [
    { name: 'Sage Green', primary: '#5A6B5D', secondary: '#E8E6E1' },
    { name: 'Ocean Blue', primary: '#2563EB', secondary: '#DBEAFE' },
    { name: 'Warm Orange', primary: '#EA580C', secondary: '#FED7AA' },
    { name: 'Royal Purple', primary: '#7C3AED', secondary: '#EDE9FE' },
    { name: 'Rose', primary: '#E11D48', secondary: '#FCE7F3' },
    { name: 'Slate', primary: '#475569', secondary: '#F1F5F9' },
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
        <h1 className="font-serif text-3xl font-medium text-foreground">Settings</h1>
        <p className="text-muted-foreground">Customize your restaurant's appearance</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Restaurant Information
            </CardTitle>
            <CardDescription>Basic information about your restaurant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Restaurant"
                data-testid="settings-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                data-testid="settings-logo-input"
              />
              {form.logo_url && (
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <img 
                    src={form.logo_url} 
                    alt="Logo preview" 
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
              Brand Colors
            </CardTitle>
            <CardDescription>Customize your restaurant's color scheme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Presets */}
            <div className="space-y-2">
              <Label>Color Presets</Label>
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
                <Label htmlFor="primary">Primary Color</Label>
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
                <Label htmlFor="secondary">Secondary Color</Label>
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
              <Label>Preview</Label>
              <div 
                className="p-6 rounded-lg border border-border"
                style={{ backgroundColor: form.secondary_color }}
              >
                <h3 
                  className="font-serif text-2xl mb-2"
                  style={{ color: form.primary_color }}
                >
                  {form.name || 'My Restaurant'}
                </h3>
                <button
                  type="button"
                  className="px-6 py-2 rounded-full text-white font-medium"
                  style={{ backgroundColor: form.primary_color }}
                >
                  Sample Button
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
              Currency Settings
            </CardTitle>
            <CardDescription>Configure your pricing display</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency Code</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={3}
                  data-testid="currency-code-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Currency Symbol</Label>
                <Input
                  id="symbol"
                  value={form.currency_symbol}
                  onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                  placeholder="$"
                  maxLength={3}
                  data-testid="currency-symbol-input"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Preview: {form.currency_symbol}19.99
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-8" data-testid="save-settings-btn">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
