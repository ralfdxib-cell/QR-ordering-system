import React, { useState, useEffect } from 'react';
import { categoryAPI, menuItemAPI } from '../../lib/api';
import { formatCurrency, dietaryTagConfig } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  UtensilsCrossed,
  FolderOpen,
  ImageIcon
} from 'lucide-react';

export default function MenuManagement() {
  const { settings } = useSettings();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image_url: '',
    sort_order: 0,
  });

  // Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
    dietary_tags: [],
    is_available: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, itemsRes] = await Promise.all([
        categoryAPI.getAllAdmin(),
        menuItemAPI.getAllAdmin(),
      ]);
      setCategories(catRes.data);
      setMenuItems(itemsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        image_url: category.image_url || '',
        sort_order: category.sort_order || 0,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', image_url: '', sort_order: 0 });
    }
    setCategoryModalOpen(true);
  };

  const handleCategorySubmit = async () => {
    try {
      if (editingCategory) {
        await categoryAPI.update(editingCategory.id, categoryForm);
        toast.success('Category updated');
      } else {
        await categoryAPI.create(categoryForm);
        toast.success('Category created');
      }
      setCategoryModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category and all its items?')) return;
    try {
      await categoryAPI.delete(id);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  // Item handlers
  const openItemModal = (item = null, categoryId = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        category_id: item.category_id,
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        image_url: item.image_url || '',
        dietary_tags: item.dietary_tags || [],
        is_available: item.is_available,
        sort_order: item.sort_order || 0,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        category_id: categoryId || (categories[0]?.id || ''),
        name: '',
        description: '',
        price: '',
        image_url: '',
        dietary_tags: [],
        is_available: true,
        sort_order: 0,
      });
    }
    setItemModalOpen(true);
  };

  const handleItemSubmit = async () => {
    try {
      const data = {
        ...itemForm,
        price: parseFloat(itemForm.price),
      };
      
      if (editingItem) {
        await menuItemAPI.update(editingItem.id, data);
        toast.success('Item updated');
      } else {
        await menuItemAPI.create(data);
        toast.success('Item created');
      }
      setItemModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await menuItemAPI.delete(id);
      toast.success('Item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await menuItemAPI.update(item.id, { is_available: !item.is_available });
      fetchData();
      toast.success(`Item ${!item.is_available ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const toggleDietaryTag = (tag) => {
    setItemForm(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter(t => t !== tag)
        : [...prev.dietary_tags, tag]
    }));
  };

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">Menu Management</h1>
          <p className="text-muted-foreground">Manage your categories and menu items</p>
        </div>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <FolderOpen className="w-4 h-4 mr-2" />
            Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="items" data-testid="tab-items">
            <UtensilsCrossed className="w-4 h-4 mr-2" />
            Menu Items ({menuItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openCategoryModal()} data-testid="add-category-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No categories yet. Create your first category!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const itemCount = menuItems.filter(i => i.category_id === category.id).length;
                return (
                  <Card key={category.id} data-testid={`category-card-${category.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {category.image_url ? (
                            <img 
                              src={category.image_url} 
                              alt={category.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{itemCount} items</p>
                          </div>
                        </div>
                        <Badge variant={category.is_active ? 'default' : 'secondary'}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openCategoryModal(category)}
                          data-testid={`edit-category-${category.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCategory(category.id)}
                          data-testid={`delete-category-${category.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="items" className="mt-6">
          <div className="flex items-center justify-between mb-4 gap-4">
            <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? null : val)}>
              <SelectTrigger className="w-48" data-testid="filter-category-select">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openItemModal()} data-testid="add-item-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UtensilsCrossed className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No menu items yet. Create your first item!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const category = categories.find(c => c.id === item.category_id);
                return (
                  <Card key={item.id} data-testid={`item-card-${item.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground">{item.name}</h3>
                            <Badge variant="outline" className="text-xs">{category?.name}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-mono font-bold text-primary">
                              {formatCurrency(item.price, settings.currency_symbol)}
                            </span>
                            {item.dietary_tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {dietaryTagConfig[tag]?.label || tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Available</Label>
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={() => handleToggleAvailability(item)}
                              data-testid={`toggle-availability-${item.id}`}
                            />
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openItemModal(item)}
                            data-testid={`edit-item-${item.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteItem(item.id)}
                            data-testid={`delete-item-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Category name"
                data-testid="category-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Category description"
                data-testid="category-description-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={categoryForm.image_url}
                onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="category-image-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={categoryForm.sort_order}
                onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                data-testid="category-sort-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCategorySubmit} data-testid="save-category-btn">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Modal */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={itemForm.category_id} onValueChange={(val) => setItemForm({ ...itemForm, category_id: val })}>
                <SelectTrigger data-testid="item-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Item name"
                data-testid="item-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Item description"
                data-testid="item-description-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Price ({settings.currency_symbol})</Label>
              <Input
                type="number"
                step="0.01"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                placeholder="0.00"
                data-testid="item-price-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={itemForm.image_url}
                onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="item-image-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Dietary Tags</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dietaryTagConfig).map(([key, config]) => (
                  <Badge
                    key={key}
                    variant={itemForm.dietary_tags.includes(key) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleDietaryTag(key)}
                    data-testid={`dietary-tag-${key}`}
                  >
                    {config.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={itemForm.is_available}
                onCheckedChange={(val) => setItemForm({ ...itemForm, is_available: val })}
                data-testid="item-available-switch"
              />
              <Label>Available for ordering</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModalOpen(false)}>Cancel</Button>
            <Button onClick={handleItemSubmit} data-testid="save-item-btn">
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
