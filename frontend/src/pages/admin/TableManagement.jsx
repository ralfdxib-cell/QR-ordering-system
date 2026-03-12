import React, { useState, useEffect } from 'react';
import { tableAPI } from '../../lib/api';
import { getQRCodeURL } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, QrCode, RefreshCw, Download, Copy, Grid3X3 } from 'lucide-react';

export default function TableManagement() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({
    table_number: '',
    capacity: 4,
  });

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await tableAPI.getAllAdmin();
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Tafels laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (table = null) => {
    if (table) {
      setEditingTable(table);
      setTableForm({
        table_number: table.table_number,
        capacity: table.capacity,
      });
    } else {
      setEditingTable(null);
      setTableForm({ table_number: '', capacity: 4 });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingTable) {
        await tableAPI.update(editingTable.id, tableForm);
        toast.success('Tafel bijgewerkt');
      } else {
        await tableAPI.create(tableForm);
        toast.success('Tafel aangemaakt');
      }
      setModalOpen(false);
      fetchTables();
    } catch (error) {
      toast.error('Tafel opslaan mislukt');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deze tafel verwijderen?')) return;
    try {
      await tableAPI.delete(id);
      toast.success('Tafel verwijderd');
      fetchTables();
    } catch (error) {
      toast.error('Tafel verwijderen mislukt');
    }
  };

  const handleToggleActive = async (table) => {
    try {
      await tableAPI.update(table.id, { is_active: !table.is_active });
      fetchTables();
      toast.success(`Tafel ${!table.is_active ? 'geactiveerd' : 'gedeactiveerd'}`);
    } catch (error) {
      toast.error('Tafel bijwerken mislukt');
    }
  };

  const handleRegenerateQR = async (tableId) => {
    try {
      await tableAPI.regenerateQR(tableId);
      fetchTables();
      toast.success('QR-code opnieuw gegenereerd');
    } catch (error) {
      toast.error('QR-code genereren mislukt');
    }
  };

  const openQRModal = (table) => {
    setSelectedTable(table);
    setQrModalOpen(true);
  };

  const getTableURL = (table) => {
    const baseURL = window.location.origin;
    return `${baseURL}/table/${table.qr_code}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Gekopieerd naar klembord');
  };

  const downloadQR = (table) => {
    const url = getQRCodeURL(getTableURL(table), 400);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tafel-${table.table_number}-qr.png`;
    link.click();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">Tafels & QR-codes</h1>
          <p className="text-muted-foreground">Beheer tafels en genereer QR-codes voor bestellen</p>
        </div>
        <Button onClick={() => openModal()} data-testid="add-table-btn">
          <Plus className="w-4 h-4 mr-2" />
          Tafel Toevoegen
        </Button>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Grid3X3 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nog geen tafels. Maak uw eerste tafel aan!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <Card key={table.id} data-testid={`table-card-${table.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-mono">Tafel {table.table_number}</CardTitle>
                  <Badge variant={table.is_active ? 'default' : 'secondary'}>
                    {table.is_active ? 'Actief' : 'Inactief'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Code Preview */}
                <div 
                  className="aspect-square bg-white rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openQRModal(table)}
                >
                  <img
                    src={getQRCodeURL(getTableURL(table), 200)}
                    alt={`QR-code voor Tafel ${table.table_number}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Capaciteit</span>
                  <span className="font-medium">{table.capacity} stoelen</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openQRModal(table)}
                    data-testid={`view-qr-${table.id}`}
                  >
                    <QrCode className="w-4 h-4 mr-1" />
                    QR Bekijken
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openModal(table)}
                    data-testid={`edit-table-${table.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(table.id)}
                    data-testid={`delete-table-${table.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Label className="text-sm text-muted-foreground">Actief</Label>
                  <Switch
                    checked={table.is_active}
                    onCheckedChange={() => handleToggleActive(table)}
                    data-testid={`toggle-table-${table.id}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Tafel Bewerken' : 'Tafel Toevoegen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tafelnummer</Label>
              <Input
                value={tableForm.table_number}
                onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                placeholder="bijv. 1, A1, Terras-1"
                data-testid="table-number-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Capaciteit (stoelen)</Label>
              <Input
                type="number"
                min={1}
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 1 })}
                data-testid="table-capacity-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuleren</Button>
            <Button onClick={handleSubmit} data-testid="save-table-btn">
              {editingTable ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR-code - Tafel {selectedTable?.table_number}</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              {/* Large QR Code */}
              <div className="bg-white rounded-lg p-6">
                <img
                  src={getQRCodeURL(getTableURL(selectedTable), 300)}
                  alt={`QR-code voor Tafel ${selectedTable.table_number}`}
                  className="w-full"
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label>Menu URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={getTableURL(selectedTable)}
                    readOnly
                    className="text-xs"
                    data-testid="table-url-input"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(getTableURL(selectedTable))}
                    data-testid="copy-url-btn"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => downloadQR(selectedTable)}
                  data-testid="download-qr-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleRegenerateQR(selectedTable.id)}
                  data-testid="regenerate-qr-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Opnieuw
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Print deze QR-code en plaats deze op de tafel. Klanten kunnen scannen om het menu te bekijken en te bestellen.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
