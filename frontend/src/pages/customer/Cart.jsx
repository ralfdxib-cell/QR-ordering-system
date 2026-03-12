import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Loader2, UtensilsCrossed } from 'lucide-react';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, table, updateQuantity, removeFromCart, clearCart, getCartTotal } = useCart();
  const { settings } = useSettings();
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!table) {
      toast.error('Scan eerst een tafel QR-code');
      return;
    }

    if (cart.length === 0) {
      toast.error('Uw winkelwagen is leeg');
      return;
    }

    setLoading(true);
    try {
      const orderItems = cart.map(item => ({
        menu_item_id: item.menuItemId,
        menu_item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        modifiers: item.modifiers,
        special_instructions: item.specialInstructions,
        subtotal: item.subtotal,
      }));

      const orderData = {
        table_id: table.id,
        items: orderItems,
        customer_name: customerName || null,
        notes: notes || null,
      };

      const response = await orderAPI.create(orderData);
      clearCart();
      toast.success('Bestelling succesvol geplaatst!');
      navigate(`/order/${response.data.id}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Bestelling mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  const cartTotal = getCartTotal();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background">
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
            <h1 className="font-serif text-2xl font-medium text-foreground">Uw Winkelwagen</h1>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <ShoppingCart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-foreground mb-2">
            Uw winkelwagen is leeg
          </h2>
          <p className="text-muted-foreground mb-6">
            Voeg heerlijke items toe vanuit ons menu
          </p>
          <Button
            onClick={() => navigate('/menu')}
            className="rounded-full px-8"
            data-testid="browse-menu-btn"
          >
            Menu Bekijken
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-48">
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
            <h1 className="font-serif text-2xl font-medium text-foreground">Uw Winkelwagen</h1>
            <p className="text-sm text-muted-foreground">{cart.length} items</p>
          </div>
        </div>
      </div>

      {/* Cart Items */}
      <div className="px-4 py-6 space-y-4">
        {cart.map((item, index) => (
          <div
            key={item.id}
            className="bg-card rounded-xl p-4 border border-border animate-slide-up"
            style={{ animationDelay: `${index * 0.05}s` }}
            data-testid={`cart-item-${item.id}`}
          >
            <div className="flex gap-4">
              {/* Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-sans font-bold text-foreground">{item.name}</h3>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    data-testid={`remove-item-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Modifiers */}
                {item.modifiers?.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.modifiers.map(m => m.name).join(', ')}
                  </p>
                )}

                {/* Special Instructions */}
                {item.specialInstructions && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    "{item.specialInstructions}"
                  </p>
                )}

                {/* Price and Quantity */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                      data-testid={`quantity-minus-${item.id}`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                      data-testid={`quantity-plus-${item.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="price-tag">
                    {formatCurrency(item.subtotal, settings.currency_symbol)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Details */}
      <div className="px-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Uw Naam (optioneel)</label>
          <Input
            placeholder="Voer uw naam in"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="rounded-lg"
            data-testid="customer-name-input"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Speciale Verzoeken (optioneel)</label>
          <Textarea
            placeholder="Extra opmerkingen voor uw bestelling?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none rounded-lg"
            rows={2}
            data-testid="order-notes-input"
          />
        </div>
      </div>

      {/* Order Summary Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe z-40">
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotaal</span>
            <span>{formatCurrency(cartTotal, settings.currency_symbol)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-foreground">
            <span>Totaal</span>
            <span className="font-mono">{formatCurrency(cartTotal, settings.currency_symbol)}</span>
          </div>
        </div>
        <Button
          onClick={handlePlaceOrder}
          disabled={loading || !table}
          className="w-full h-14 rounded-full text-lg"
          data-testid="place-order-btn"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Bestelling Plaatsen...
            </>
          ) : (
            'Bestelling Plaatsen'
          )}
        </Button>
        {!table && (
          <p className="text-xs text-destructive text-center mt-2">
            Scan eerst een tafel QR-code om te bestellen
          </p>
        )}
      </div>
    </div>
  );
}
