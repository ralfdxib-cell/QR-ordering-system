import React, { useState, useEffect } from 'react';
import { orderAPI } from '../../lib/api';
import { formatCurrency, formatDateTime, orderStatusConfig } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Receipt, RefreshCw, Eye } from 'lucide-react';

export default function AdminOrders() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await orderAPI.getAll(params);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      fetchOrders();
      toast.success(`Order marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      new: orders.filter(o => o.status === 'new').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      served: orders.filter(o => o.status === 'served').length,
      revenue: orders.filter(o => o.status === 'served').reduce((sum, o) => sum + o.total, 0),
    };
    return stats;
  };

  const stats = getOrderStats();

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
          <h1 className="font-serif text-3xl font-medium text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage and track all orders</p>
        </div>
        <Button variant="outline" onClick={fetchOrders} data-testid="refresh-orders-btn">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
            <p className="text-xs text-muted-foreground">New</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.preparing}</p>
            <p className="text-xs text-muted-foreground">Preparing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
            <p className="text-xs text-muted-foreground">Ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-primary">
              {formatCurrency(stats.revenue, settings.currency_symbol)}
            </p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="status-filter-select">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="served">Served</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusConfig = orderStatusConfig[order.status];
            return (
              <Card key={order.id} data-testid={`order-card-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-mono font-bold text-primary text-lg">
                          {order.table_number}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">
                            Table {order.table_number}
                            {order.customer_name && ` - ${order.customer_name}`}
                          </h3>
                          <Badge className={statusConfig?.color}>
                            {statusConfig?.label || order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items • {formatDateTime(order.created_at)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          #{order.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-lg text-foreground">
                        {formatCurrency(order.total, settings.currency_symbol)}
                      </span>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDetailModal(order)}
                          data-testid={`view-order-${order.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>

                        {order.status !== 'served' && order.status !== 'cancelled' && (
                          <Select 
                            value={order.status} 
                            onValueChange={(val) => updateOrderStatus(order.id, val)}
                          >
                            <SelectTrigger className="w-32" data-testid={`status-select-${order.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="served">Served</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-foreground">
                    Table {selectedOrder.table_number}
                    {selectedOrder.customer_name && ` - ${selectedOrder.customer_name}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(selectedOrder.created_at)}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    #{selectedOrder.id}
                  </p>
                </div>
                <Badge className={orderStatusConfig[selectedOrder.status]?.color}>
                  {orderStatusConfig[selectedOrder.status]?.label || selectedOrder.status}
                </Badge>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Items</h4>
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {item.quantity}× {item.menu_item_name}
                          </span>
                        </div>
                        {item.modifiers?.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {item.modifiers.map(m => m.name).join(', ')}
                          </p>
                        )}
                        {item.special_instructions && (
                          <p className="text-xs text-orange-600 italic">
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
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <span className="font-medium">Order Notes:</span> {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-mono font-bold text-xl text-primary">
                  {formatCurrency(selectedOrder.total, settings.currency_symbol)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
