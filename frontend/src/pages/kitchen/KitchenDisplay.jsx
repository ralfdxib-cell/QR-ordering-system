import React, { useState, useEffect } from 'react';
import { orderAPI } from '../../lib/api';
import { formatTimeElapsed, getTimerStatus, orderStatusConfig } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loader2, RefreshCw, ChefHat, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 5 seconds
    const orderInterval = setInterval(fetchOrders, 5000);
    // Update time display every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(orderInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getActive();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
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
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
    }
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'new': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'served';
      default: return null;
    }
  };

  const getStatusAction = (status) => {
    switch (status) {
      case 'new': return 'Start Preparing';
      case 'preparing': return 'Mark Ready';
      case 'ready': return 'Mark Served';
      default: return null;
    }
  };

  const newOrders = orders.filter(o => o.status === 'new');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-sky-400" />
          <div>
            <h1 className="font-mono text-xl font-bold text-white">Kitchen Display</h1>
            <p className="text-sm text-slate-400">Active Orders: {orders.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-300">New ({newOrders.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-slate-300">Preparing ({preparingOrders.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-slate-300">Ready ({readyOrders.length})</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-testid="refresh-orders-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <ChefHat className="w-16 h-16 text-slate-600 mb-4" />
          <h2 className="text-xl font-mono text-slate-400">No Active Orders</h2>
          <p className="text-slate-500">New orders will appear here</p>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {orders.map((order) => {
            const statusConfig = orderStatusConfig[order.status];
            const timerStatus = getTimerStatus(order.created_at);
            const nextStatus = getNextStatus(order.status);
            
            return (
              <div
                key={order.id}
                className={`kds-ticket ${statusConfig?.borderColor || 'border-l-slate-500'} bg-slate-800`}
                data-testid={`kds-order-${order.id}`}
              >
                {/* Ticket Header */}
                <div className="p-3 flex justify-between items-center border-b border-slate-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-white">
                        Table {order.table_number}
                      </span>
                      {order.customer_name && (
                        <span className="text-sm text-slate-400">({order.customer_name})</span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      #{order.id.slice(0, 8)}
                    </span>
                  </div>
                  <Badge className={statusConfig?.color || 'bg-slate-700'}>
                    {statusConfig?.label || order.status}
                  </Badge>
                </div>

                {/* Timer */}
                <div className={`px-3 py-2 border-b border-slate-700 flex items-center gap-2 ${
                  timerStatus === 'critical' ? 'bg-red-900/30' :
                  timerStatus === 'warning' ? 'bg-yellow-900/30' :
                  'bg-slate-800'
                }`}>
                  <Clock className={`w-4 h-4 ${
                    timerStatus === 'critical' ? 'text-red-400' :
                    timerStatus === 'warning' ? 'text-yellow-400' :
                    'text-green-400'
                  }`} />
                  <span className={`font-mono text-lg font-bold ${
                    timerStatus === 'critical' ? 'text-red-400' :
                    timerStatus === 'warning' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {formatTimeElapsed(order.created_at)}
                  </span>
                </div>

                {/* Items */}
                <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-48">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-mono font-bold text-sky-400 text-lg w-6">
                        {item.quantity}×
                      </span>
                      <div className="flex-1">
                        <span className="font-medium text-white">{item.menu_item_name}</span>
                        {item.modifiers?.length > 0 && (
                          <p className="text-sm text-yellow-400">
                            → {item.modifiers.map(m => m.name).join(', ')}
                          </p>
                        )}
                        {item.special_instructions && (
                          <p className="text-sm text-orange-400 italic">
                            "{item.special_instructions}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Notes */}
                {order.notes && (
                  <div className="px-3 py-2 border-t border-slate-700 bg-slate-900/50">
                    <p className="text-sm text-orange-400">
                      <span className="font-bold">Note:</span> {order.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-3 border-t border-slate-700 space-y-2">
                  {nextStatus && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, nextStatus)}
                      className={`w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider ${
                        order.status === 'new' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
                        order.status === 'preparing' ? 'bg-green-500 hover:bg-green-600 text-black' :
                        'bg-sky-500 hover:bg-sky-600 text-black'
                      }`}
                      data-testid={`action-btn-${order.id}`}
                    >
                      {order.status === 'preparing' && <CheckCircle className="w-5 h-5 mr-2" />}
                      {getStatusAction(order.status)}
                    </Button>
                  )}
                  {order.status !== 'ready' && (
                    <Button
                      variant="ghost"
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/30"
                      data-testid={`cancel-btn-${order.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
