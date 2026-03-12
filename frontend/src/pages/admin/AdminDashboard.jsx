import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI, categoryAPI, menuItemAPI, tableAPI } from '../../lib/api';
import { formatCurrency, orderStatusConfig } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Loader2, TrendingUp, ShoppingCart, UtensilsCrossed, Grid3X3 } from 'lucide-react';

// Dutch status labels
const statusLabelsNL = {
  new: 'Nieuw',
  preparing: 'In Bereiding',
  ready: 'Klaar',
  served: 'Geserveerd',
  cancelled: 'Geannuleerd',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    totalRevenue: 0,
    menuItems: 0,
    categories: 0,
    tables: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, activeOrdersRes, categoriesRes, menuItemsRes, tablesRes] = await Promise.all([
        orderAPI.getAll(),
        orderAPI.getActive(),
        categoryAPI.getAllAdmin(),
        menuItemAPI.getAllAdmin(),
        tableAPI.getAllAdmin(),
      ]);

      const allOrders = ordersRes.data;
      const totalRevenue = allOrders
        .filter(o => o.status === 'served')
        .reduce((sum, o) => sum + o.total, 0);

      setStats({
        totalOrders: allOrders.length,
        activeOrders: activeOrdersRes.data.length,
        totalRevenue,
        menuItems: menuItemsRes.data.length,
        categories: categoriesRes.data.length,
        tables: tablesRes.data.length,
      });

      setRecentOrders(allOrders.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welkom terug bij {settings.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/orders')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actieve Bestellingen</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground">{stats.totalOrders} totaal bestellingen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Omzet</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-foreground">
              {formatCurrency(stats.totalRevenue, settings.currency_symbol)}
            </div>
            <p className="text-xs text-muted-foreground">Van geserveerde bestellingen</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/menu')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Menu Items</CardTitle>
            <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.menuItems}</div>
            <p className="text-xs text-muted-foreground">{stats.categories} categorieën</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/tables')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tafels</CardTitle>
            <Grid3X3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.tables}</div>
            <p className="text-xs text-muted-foreground">Actieve tafels</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium">Recente Bestellingen</CardTitle>
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-sm text-primary hover:underline"
            data-testid="view-all-orders-btn"
          >
            Alles Bekijken
          </button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nog geen bestellingen</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const statusConfig = orderStatusConfig[order.status];
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    data-testid={`recent-order-${order.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-mono font-bold text-primary">
                          {order.table_number}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Tafel {order.table_number}
                          {order.customer_name && ` - ${order.customer_name}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items • {formatCurrency(order.total, settings.currency_symbol)}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusConfig?.color}>
                      {statusLabelsNL[order.status] || statusConfig?.label || order.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
