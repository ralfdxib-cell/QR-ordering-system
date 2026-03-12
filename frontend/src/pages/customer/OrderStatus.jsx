import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateTime, orderStatusConfig } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loader2, CheckCircle2, Clock, ChefHat, UtensilsCrossed, ArrowLeft, RefreshCw } from 'lucide-react';

// Dutch status labels
const statusLabelsNL = {
  new: 'Nieuw',
  preparing: 'In Bereiding',
  ready: 'Klaar',
  served: 'Geserveerd',
  cancelled: 'Geannuleerd',
};

export default function OrderStatus() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.getOne(orderId);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new':
        return <Clock className="w-8 h-8" />;
      case 'preparing':
        return <ChefHat className="w-8 h-8" />;
      case 'ready':
        return <CheckCircle2 className="w-8 h-8" />;
      case 'served':
        return <UtensilsCrossed className="w-8 h-8" />;
      default:
        return <Clock className="w-8 h-8" />;
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'new':
        return 'Uw bestelling is ontvangen';
      case 'preparing':
        return 'De keuken bereidt uw bestelling voor';
      case 'ready':
        return 'Uw bestelling is klaar!';
      case 'served':
        return 'Eet smakelijk!';
      case 'cancelled':
        return 'Deze bestelling is geannuleerd';
      default:
        return 'Bestelling wordt verwerkt';
    }
  };

  const statusSteps = ['new', 'preparing', 'ready', 'served'];
  const statusStepsNL = ['Ontvangen', 'In Bereiding', 'Klaar', 'Geserveerd'];
  const currentStepIndex = statusSteps.indexOf(order?.status || 'new');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <h1 className="font-serif text-2xl font-medium text-foreground mb-4">Bestelling Niet Gevonden</h1>
        <Button onClick={() => navigate('/menu')} className="rounded-full" data-testid="back-to-menu-btn">
          Terug naar Menu
        </Button>
      </div>
    );
  }

  const statusConfig = orderStatusConfig[order.status] || orderStatusConfig.new;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/menu')}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-medium text-foreground">Bestelstatus</h1>
            <p className="text-sm text-muted-foreground">Tafel {order.table_number}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            data-testid="refresh-btn"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className="px-4 py-8">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            order.status === 'ready' ? 'bg-green-100 text-green-600 animate-pulse-ring' :
            order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
            'bg-primary/10 text-primary'
          }`}>
            {getStatusIcon(order.status)}
          </div>
          <Badge className={`${statusConfig.color} px-4 py-1 text-sm mb-2`}>
            {statusLabelsNL[order.status] || statusConfig.label}
          </Badge>
          <p className="text-lg text-foreground font-medium mt-2">
            {getStatusMessage(order.status)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Besteld op {formatDateTime(order.created_at)}
          </p>
        </div>

        {/* Progress Steps */}
        {order.status !== 'cancelled' && (
          <div className="flex justify-between items-center mb-8 px-4">
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                      {index + 1}
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {statusStepsNL[index]}
                    </span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Order Details Card */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-sans font-bold text-foreground">Besteldetails</h2>
            <p className="text-sm text-muted-foreground font-mono">#{order.id.slice(0, 8)}</p>
          </div>

          {/* Items */}
          <div className="divide-y divide-border">
            {order.items.map((item, index) => (
              <div key={index} className="p-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {item.quantity}
                    </span>
                    <span className="font-medium text-foreground">{item.menu_item_name}</span>
                  </div>
                  {item.modifiers?.length > 0 && (
                    <p className="text-sm text-muted-foreground ml-8 mt-1">
                      {item.modifiers.map(m => m.name).join(', ')}
                    </p>
                  )}
                  {item.special_instructions && (
                    <p className="text-xs text-muted-foreground ml-8 mt-1 italic">
                      "{item.special_instructions}"
                    </p>
                  )}
                </div>
                <span className="font-mono text-foreground">
                  {formatCurrency(item.subtotal, settings.currency_symbol)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="p-4 bg-muted/50 flex justify-between items-center">
            <span className="font-bold text-foreground">Totaal</span>
            <span className="font-mono font-bold text-lg text-foreground">
              {formatCurrency(order.total, settings.currency_symbol)}
            </span>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Opmerkingen:</span> {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Order Button */}
      <div className="fixed bottom-6 left-4 right-4 z-40">
        <Button
          onClick={() => navigate('/menu')}
          variant="outline"
          className="w-full h-14 rounded-full"
          data-testid="new-order-btn"
        >
          Meer Bestellen
        </Button>
      </div>
    </div>
  );
}
