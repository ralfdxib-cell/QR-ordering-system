import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  Building2, Users, ShoppingBag, LogOut, RefreshCw, 
  CheckCircle, XCircle, Clock, AlertTriangle 
} from 'lucide-react';

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trial: 0,
    cancelled: 0
  });

  useEffect(() => {
    // Check if platform admin
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    if (!user.is_platform_admin) {
      toast.error('Geen toegang tot platform beheer');
      navigate('/platform/login');
      return;
    }
    
    fetchTenants();
  }, [navigate]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await platformAPI.getAllTenants();
      const data = response.data;
      setTenants(data);
      
      // Calculate stats
      setStats({
        total: data.length,
        active: data.filter(t => t.subscription_status === 'active').length,
        trial: data.filter(t => t.subscription_status === 'trial').length,
        cancelled: data.filter(t => t.subscription_status === 'cancelled').length
      });
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Kon restaurants niet laden');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (tenantId, newStatus) => {
    try {
      await platformAPI.updateTenantStatus(tenantId, newStatus);
      toast.success(`Status gewijzigd naar ${newStatus}`);
      fetchTenants();
    } catch (error) {
      toast.error('Status wijzigen mislukt');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('tenant');
    navigate('/platform/login');
  };

  const getStatusBadge = (status) => {
    const variants = {
      trial: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      suspended: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
    };
    const variant = variants[status] || variants.trial;
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Platform Beheer</h1>
              <p className="text-xs text-muted-foreground">Super Admin Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" />
            Uitloggen
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totaal Restaurants</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actief</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Proefperiode</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.trial}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Geannuleerd</p>
                  <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Alle Restaurants</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchTenants} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Vernieuwen
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Laden...
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nog geen restaurants geregistreerd
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Restaurant</th>
                      <th className="pb-3 font-medium">Slug</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Aangemaakt</th>
                      <th className="pb-3 font-medium">Bestellingen</th>
                      <th className="pb-3 font-medium text-right">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="border-b last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            {tenant.logo_url ? (
                              <img 
                                src={`${process.env.REACT_APP_BACKEND_URL}${tenant.logo_url}`}
                                alt={tenant.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: tenant.primary_color || '#5A6B5D' }}
                              >
                                {tenant.name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium">{tenant.name}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            /r/{tenant.slug}
                          </code>
                        </td>
                        <td className="py-4 text-sm">{tenant.email}</td>
                        <td className="py-4">{getStatusBadge(tenant.subscription_status)}</td>
                        <td className="py-4 text-sm">{formatDate(tenant.created_at)}</td>
                        <td className="py-4 text-sm">{tenant.orders_this_month || 0}</td>
                        <td className="py-4">
                          <div className="flex gap-2 justify-end">
                            {tenant.subscription_status !== 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => updateStatus(tenant.id, 'active')}
                              >
                                Activeren
                              </Button>
                            )}
                            {tenant.subscription_status !== 'suspended' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600"
                                onClick={() => updateStatus(tenant.id, 'suspended')}
                              >
                                Opschorten
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
