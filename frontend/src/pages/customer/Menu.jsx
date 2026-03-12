import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryAPI, menuItemAPI } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, dietaryTagConfig } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '../../components/ui/drawer';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { ShoppingCart, Plus, Minus, Loader2, UtensilsCrossed, X } from 'lucide-react';

export default function Menu() {
  const navigate = useNavigate();
  const { table, cart, addToCart, getCartCount, getCartTotal } = useCart();
  const { settings } = useSettings();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchMenuItems(selectedCategory);
    } else {
      fetchMenuItems();
    }
  }, [selectedCategory]);

  const fetchData = async () => {
    try {
      const [catResponse] = await Promise.all([
        categoryAPI.getAll(),
      ]);
      setCategories(catResponse.data);
      // Fetch all items initially
      const itemsResponse = await menuItemAPI.getAll();
      setMenuItems(itemsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async (categoryId = null) => {
    try {
      const response = await menuItemAPI.getAll(categoryId);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setQuantity(1);
    setSelectedModifiers([]);
    setSpecialInstructions('');
    setDrawerOpen(true);
  };

  const handleModifierToggle = (groupId, option, maxSelections) => {
    setSelectedModifiers(prev => {
      const groupModifiers = prev.filter(m => m.groupId === groupId);
      const hasOption = groupModifiers.some(m => m.id === option.id);

      if (hasOption) {
        // Remove option
        return prev.filter(m => !(m.groupId === groupId && m.id === option.id));
      } else {
        // Add option (respect max selections)
        if (maxSelections === 1) {
          // Single selection - replace existing
          return [...prev.filter(m => m.groupId !== groupId), { ...option, groupId }];
        } else if (groupModifiers.length < maxSelections) {
          // Multi selection - add if under limit
          return [...prev, { ...option, groupId }];
        }
        return prev;
      }
    });
  };

  const calculateItemTotal = () => {
    if (!selectedItem) return 0;
    const modifierTotal = selectedModifiers.reduce((sum, mod) => sum + (mod.price || 0), 0);
    return (selectedItem.price + modifierTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    addToCart(selectedItem, quantity, selectedModifiers, specialInstructions);
    setDrawerOpen(false);
    setSelectedItem(null);
  };

  const cartCount = getCartCount();
  const cartTotal = getCartTotal();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              {settings.name}
            </h1>
            {table && (
              <Badge variant="secondary" className="font-mono">
                Table {table.table_number}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Browse our menu</p>
        </div>

        {/* Category Pills */}
        <div className="category-scroll px-4 pb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`category-pill px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
            data-testid="category-all"
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`category-pill px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
              data-testid={`category-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="px-4 py-6">
        {menuItems.length === 0 ? (
          <div className="text-center py-12">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item, index) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`menu-card group bg-card rounded-xl overflow-hidden border border-transparent hover:border-border cursor-pointer animate-slide-up`}
                style={{ animationDelay: `${index * 0.05}s` }}
                data-testid={`menu-item-${item.id}`}
              >
                {/* Image */}
                <div className="menu-item-image">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <UtensilsCrossed className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-sans text-lg font-bold text-foreground line-clamp-1">
                      {item.name}
                    </h3>
                    <span className="price-tag shrink-0">
                      {formatCurrency(item.price, settings.currency_symbol)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}
                  {/* Dietary Tags */}
                  {item.dietary_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.dietary_tags.map((tag) => {
                        const tagConfig = dietaryTagConfig[tag];
                        return tagConfig ? (
                          <span
                            key={tag}
                            className={`dietary-badge ${tagConfig.color}`}
                          >
                            {tagConfig.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-40">
          <Button
            onClick={() => navigate('/cart')}
            className="w-full h-14 rounded-full shadow-floating bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="view-cart-btn"
          >
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="font-medium">{cartCount} items</span>
              </div>
              <span className="font-mono font-bold">
                {formatCurrency(cartTotal, settings.currency_symbol)}
              </span>
            </div>
          </Button>
        </div>
      )}

      {/* Item Detail Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          {selectedItem && (
            <>
              <DrawerHeader className="relative p-0">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
                  data-testid="close-drawer-btn"
                >
                  <X className="w-4 h-4" />
                </button>
                {selectedItem.image_url && (
                  <div className="h-48 w-full">
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <DrawerTitle className="font-serif text-2xl font-medium text-foreground">
                    {selectedItem.name}
                  </DrawerTitle>
                  {selectedItem.description && (
                    <p className="text-muted-foreground mt-2">{selectedItem.description}</p>
                  )}
                  <p className="price-tag mt-2 text-xl">
                    {formatCurrency(selectedItem.price, settings.currency_symbol)}
                  </p>
                </div>
              </DrawerHeader>

              <ScrollArea className="flex-1 px-4">
                {/* Modifier Groups */}
                {selectedItem.modifier_groups?.length > 0 && (
                  <div className="space-y-6 pb-4">
                    {selectedItem.modifier_groups.map((group) => (
                      <div key={group.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-sans font-semibold text-foreground">
                            {group.name}
                          </h4>
                          {group.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {group.max_selections === 1 
                            ? 'Select one' 
                            : `Select up to ${group.max_selections}`}
                        </p>
                        <div className="space-y-2">
                          {group.options.map((option) => {
                            const isSelected = selectedModifiers.some(
                              m => m.groupId === group.id && m.id === option.id
                            );
                            return (
                              <div
                                key={option.id}
                                onClick={() => handleModifierToggle(group.id, option, group.max_selections)}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:border-primary/50'
                                }`}
                                data-testid={`modifier-${option.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox checked={isSelected} />
                                  <span className="font-sans text-foreground">{option.name}</span>
                                </div>
                                {option.price > 0 && (
                                  <span className="text-sm text-muted-foreground">
                                    +{formatCurrency(option.price, settings.currency_symbol)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Special Instructions */}
                <div className="space-y-2 pb-4">
                  <h4 className="font-sans font-semibold text-foreground">Special Instructions</h4>
                  <Textarea
                    placeholder="Any allergies or special requests?"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="resize-none"
                    rows={3}
                    data-testid="special-instructions-input"
                  />
                </div>
              </ScrollArea>

              <DrawerFooter className="border-t border-border">
                {/* Quantity Selector */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                    data-testid="quantity-minus-btn"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-xl font-bold w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                    data-testid="quantity-plus-btn"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  onClick={handleAddToCart}
                  className="w-full h-14 rounded-full text-lg"
                  data-testid="add-to-cart-btn"
                >
                  Add to Cart - {formatCurrency(calculateItemTotal(), settings.currency_symbol)}
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
