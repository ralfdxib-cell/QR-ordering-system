import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { CartProvider } from "./context/CartContext";
import { SettingsProvider } from "./context/SettingsContext";

// Customer Pages
import TableLanding from "./pages/customer/TableLanding";
import Menu from "./pages/customer/Menu";
import Cart from "./pages/customer/Cart";
import OrderStatus from "./pages/customer/OrderStatus";
import TenantMenu from "./pages/customer/TenantMenu";
import TenantCart from "./pages/customer/TenantCart";

// Kitchen Pages
import KitchenDisplay from "./pages/kitchen/KitchenDisplay";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MenuManagement from "./pages/admin/MenuManagement";
import TableManagement from "./pages/admin/TableManagement";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSettings from "./pages/admin/AdminSettings";

// Auth Pages
import Register from "./pages/auth/Register";

// Platform Admin Pages
import PlatformDashboard from "./pages/platform/PlatformDashboard";

function App() {
  return (
    <SettingsProvider>
      <CartProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<TableLanding />} />
              <Route path="/table/:qrCode" element={<TableLanding />} />

              {/* Restaurant Registration */}
              <Route path="/register" element={<Register />} />

              {/* Tenant-specific Customer Routes (Multi-tenant) */}
              <Route path="/r/:slug/menu" element={<TenantMenu />} />
              <Route path="/r/:slug/cart" element={<TenantCart />} />
              <Route path="/r/:slug/order/:orderId" element={<OrderStatus />} />
              <Route path="/r/:slug/kitchen" element={<KitchenDisplay />} />

              {/* Legacy Customer Routes (for backwards compatibility) */}
              <Route path="/menu" element={<Menu />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order/:orderId" element={<OrderStatus />} />

              {/* Kitchen Route */}
              <Route path="/kitchen" element={<KitchenDisplay />} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="menu" element={<MenuManagement />} />
                <Route path="tables" element={<TableManagement />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Platform Admin Routes */}
              <Route path="/platform" element={<PlatformDashboard />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </div>
      </CartProvider>
    </SettingsProvider>
  );
}

export default App;
