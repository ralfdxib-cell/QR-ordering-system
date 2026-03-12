import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tableAPI, seedAPI } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '../../components/ui/button';
import { Loader2, UtensilsCrossed, AlertCircle, Sparkles } from 'lucide-react';

export default function TableLanding() {
  const { qrCode } = useParams();
  const navigate = useNavigate();
  const { setCurrentTable } = useCart();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [table, setTable] = useState(null);

  useEffect(() => {
    if (qrCode) {
      fetchTable();
    } else {
      setLoading(false);
    }
  }, [qrCode]);

  const fetchTable = async () => {
    try {
      const response = await tableAPI.getByQR(qrCode);
      setTable(response.data);
      setCurrentTable(response.data);
      setTimeout(() => {
        navigate('/menu');
      }, 2000);
    } catch (err) {
      setError('Tafel niet gevonden. Scan een geldige QR-code.');
      setLoading(false);
    }
  };

  const handleDemoMode = async () => {
    try {
      setLoading(true);
      await seedAPI.seed();
      const tablesResponse = await tableAPI.getAll();
      if (tablesResponse.data.length > 0) {
        const firstTable = tablesResponse.data[0];
        setTable(firstTable);
        setCurrentTable(firstTable);
        navigate('/menu');
      }
    } catch (err) {
      console.error('Error entering demo mode:', err);
      setError('Demo modus kon niet worden gestart. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  if (qrCode && loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground mb-2">
              Tafel zoeken...
            </h1>
            <p className="text-muted-foreground">
              Even geduld terwijl we het menu voorbereiden
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (table) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6 animate-slide-up">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse-ring">
            <UtensilsCrossed className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-4xl font-medium text-foreground mb-2">
              Welkom bij {settings.name}!
            </h1>
            <p className="text-xl text-muted-foreground">
              U zit aan <span className="font-semibold text-foreground">Tafel {table.table_number}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Doorsturen naar menu...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground mb-2">
              Oeps!
            </h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button
            onClick={() => navigate('/')}
            className="rounded-full px-8"
            data-testid="go-home-btn"
          >
            Naar Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div 
        className="relative h-[50vh] bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)'
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          <h1 className="font-serif text-5xl md:text-6xl font-medium text-white mb-4 animate-slide-up">
            {settings.name}
          </h1>
          <p className="text-lg text-white/80 max-w-md animate-fade-in">
            Scan de QR-code op uw tafel om het menu te bekijken en te bestellen
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-6 py-12 max-w-lg mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-foreground">
            Hoe Bestellen
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>1. Scan de QR-code op uw tafel</p>
            <p>2. Bekijk ons heerlijke menu</p>
            <p>3. Voeg items toe aan uw winkelwagen</p>
            <p>4. Plaats uw bestelling</p>
            <p>5. Betaal bij de kassa wanneer klaar</p>
          </div>
        </div>

        <div className="pt-6 border-t border-border space-y-4">
          <p className="text-sm text-muted-foreground">
            Voor demonstratiedoeleinden kunt u zonder scannen bestellen:
          </p>
          <Button 
            onClick={handleDemoMode}
            className="rounded-full px-8 gap-2"
            size="lg"
            disabled={loading}
            data-testid="demo-mode-btn"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Demo Modus Starten
          </Button>
        </div>

        <div className="pt-6 border-t border-border space-y-4">
          <p className="text-sm text-muted-foreground">
            Restauranteigenaar? Open het beheerpaneel:
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline"
              onClick={() => navigate('/admin/login')}
              className="rounded-full"
              data-testid="admin-login-btn"
            >
              Beheerder Login
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/kitchen')}
              className="rounded-full"
              data-testid="kitchen-btn"
            >
              Keuken Display
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
